const express = require('express');
const axios = require('axios');
const { xml2js } = require('xml-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// 🔐 LOGIN API
app.post('/api/login', async (req, res) => {
    const CUS_ID = req.body.CUS_ID || req.body.customerId;
    const PASSWORD = req.body.PASSWORD || req.body.password;

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:rfc:functions">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZSD_LOGINPAGE_FM>
                <CUS_ID>${CUS_ID}</CUS_ID>
                <PASSWORD>${PASSWORD}</PASSWORD>
            </urn:ZSD_LOGINPAGE_FM>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_rb?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100',
                },
                responseType: 'text',
            }
        );

        const evStatusMatch = response.data.match(/<MESSAGE>(.*?)<\/MESSAGE>/);
        const ev_status = evStatusMatch ? evStatusMatch[1] : 'F';

        res.json({ status: ev_status });
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP login service failed.' });
    }
});

// 📄 PROFILE API

app.post('/api/get-profile', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const sapRequestXML = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
      <soapenv:Header/>
      <soapenv:Body>
         <urn:ZsdCustProfDet>
            <IvKunnr>${customerId}</IvKunnr>
         </urn:ZsdCustProfDet>
      </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zcust_ws?sap-client=100',
            sapRequestXML,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;

        // Extract fields from raw XML response (adjust these tag names as per actual SOAP response)
        const getValue = (tag) => {
            const match = rawXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
            return match ? match[1] : null;
        };

        const profileData = {
            CustomerID: getValue('Kunnr'),
            Name: getValue('Name1'),
            City: getValue('Ort01'),
            Region: getValue('Regio'),
            Country: getValue('Land1'),
            Phone: getValue('Telf1'),
            Email: getValue('SmtpAddr'),
            Industry: getValue('Bran1'),
            AccountGroup: getValue('Ktokd'),
            CompanyCode: getValue('Bukrs'),
            CompanyName: getValue('Butxt'),
            Currency: getValue('Waers'),
            CustomerGroup: getValue('Kdgrp'),
            SalesOrg: getValue('Vkorg'),
            DistributionChannel: getValue('Vtweg'),
            Division: getValue('Spart'),
            Address: `${getValue('Stras') || ''}, ${getValue('Ort01') || ''}, ${getValue('Pstlz') || ''}`,
        };

        // Check if key field exists
        if (!profileData.CustomerID) {
            return res.status(404).json({ status: 'no_data', message: 'No profile data found' });
        }

        res.status(200).json({ status: 'success', profile: profileData });
    } catch (error) {
        console.error('Profile Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP profile service failed.' });
    }
});

// Credit and Debit Memo API
app.post('/api/memo', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusCreDebFm>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZcusCreDebFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zcre_deb_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                BillDocNo: getValue('BillDocNo'),
                BillType: getValue('BillType'),
                BillDate: getValue('BillDate'),
                SalesOrg: getValue('SalesOrg'),
                CustomerId: getValue('CustomerId'),
                NetVal: getValue('NetVal'),
                Currency: getValue('Currency'),
                MatNo: getValue('MatNo'),
                Quantity: getValue('Quantity'),
                SalesUnit: getValue('SalesUnit')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No memo records found' });
        }

        res.status(200).json({ status: 'success', memoData: items });
    } catch (error) {
        console.error('Memo Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP memo service failed.' });
    }
});

// Delivery API
app.post('/api/delivery', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusDelvFm>
                <Id>${customerId}</Id>
            </urn:ZcusDelvFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zdelv_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                Vbeln: getValue('Vbeln'),
                Posnr: getValue('Posnr'),
                Matnr: getValue('Matnr'),
                Arktx: getValue('Arktx'),
                Lfart: getValue('Lfart'),
                Lfdat: getValue('Lfdat'),
                Kunnr: getValue('Kunnr'),
                Vrkmer: getValue('Vrkmer'),
                Lfimg: getValue('Lfimg'),
                Netwr: getValue('Netwr'),
                Waerk: getValue('Waerk'),
                Lgort: getValue('Lgort'),
                Bestk: getValue('Bestk'),
                Gbstk: getValue('Gbstk'),
                Vstel: getValue('Vstel'),
                Werks: getValue('Werks')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No delivery records found' });
        }

        res.status(200).json({ status: 'success', deliveryData: items });
    } catch (error) {
        console.error('Delivery Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP delivery service failed.' });
    }
});

// Overall Sales API
app.post('/api/overall-sales', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusOvsalFm>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZcusOvsalFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zovsal_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                CustomerId: getValue('Customerid'),
                SalesDocType: getValue('SalesDocType'),
                OrderDat: getValue('OrderDat'),
                MatNo: getValue('MatNo'),
                MatDes: getValue('MatDes'),
                SalesUnit: getValue('SalesUnit'),
                DocCurr: getValue('DocCurr'),
                ItemNo: getValue('ItemNo'),
                BillItem: getValue('BillItem'),
                BillDocNo: getValue('BillDocNo'),
                BillDat: getValue('BillDat'),
                BillType: getValue('BillType')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No overall sales records found' });
        }

        res.status(200).json({ status: 'success', overallSalesData: items });
    } catch (error) {
        console.error('Overall Sales Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP overall sales service failed.' });
    }
});

// Inquiry API
app.post('/api/inquiry', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusInqFm>
                <Id>${customerId}</Id>
            </urn:ZcusInqFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zinq_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                CustomerId: getValue('Kunnr'),
                CreatedDate: getValue('Erdat'),
                OrderType: getValue('Auart'),
                StartDate: getValue('Angdt'),
                EndDate: getValue('Bnddt'),
                SalesDocNo: getValue('Vbeln'),
                ItemNo: getValue('Posnr'),
                ItemCategory: getValue('Posar'),
                Description: getValue('Arktx'),
                NetValue: getValue('Netwr'),
                Currency: getValue('Waerk'),
                SalesUnit: getValue('Vrkme'),
                Quantity: getValue('Kwmeng')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No inquiry records found' });
        }

        res.status(200).json({ status: 'success', inquiryData: items });
    } catch (error) {
        console.error('Inquiry Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP inquiry service failed.' });
    }
});

// Sales Order API
app.post('/api/sales', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusSoFm>
                <Id>${customerId}</Id>
            </urn:ZcusSoFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsales_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                SalesDoc: getValue('Vbeln'),
                ItemNo: getValue('Posnr'),
                MaterialNo: getValue('Matnr'),
                Description: getValue('Arktx'),
                SalesType: getValue('Auart'),
                CreatedOn: getValue('Erdat'),
                Quantity: getValue('Kwmeng'),
                DeliveryDate: getValue('VdatuAna'),
                PurchaseOrder: getValue('Bstnk'),
                CustomerId: getValue('Kunnr'),
                SalesUnit: getValue('Vrkme'),
                NetValue: getValue('Netwr'),
                Currency: getValue('Waerk'),
                Division: getValue('Spart'),
                ConfirmStatus: getValue('Gbstk'),
                DeliveryStatus: getValue('Lfgsk'),
                StorageLoc: getValue('Lgort')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No sales records found' });
        }

        res.status(200).json({ status: 'success', salesData: items });
    } catch (error) {
        console.error('Sales Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP sales service failed.' });
    }
});

// Payment and Aging API
app.post('/api/payment-aging', async (req, res) => {
    const customerId = req.body.customerId || '0000000002';

    const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soapenv:Header/>
        <soapenv:Body>
            <urn:ZcusPayAgeFm>
                <Id>${customerId}</Id>
            </urn:ZcusPayAgeFm>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zpay_age_serv?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=',
                    'Cookie': 'sap-usercontext=sap-client=100'
                },
                responseType: 'text'
            }
        );

        const rawXML = response.data;
        const items = [...rawXML.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
            const itemXML = match[1];
            const getValue = (tag) => {
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
                return tagMatch ? tagMatch[1] : null;
            };

            return {
                CustomerId: getValue('CustomerId'),
                GraceDays: getValue('GraceDays'),
                BillDate: getValue('BillDate'),
                DueDate: getValue('DueDate'),
                PaymentDate: getValue('PaymentDate'),
                AgingDays: getValue('AgingDays'),
                PaymentStatus: getValue('PaymentStatus'),
                LastRemainder: getValue('LastRemainder'),
                CollectionAgent: getValue('CollectionAgent'),
                Currency: getValue('Currency'),
                Remarks: getValue('Remarks')
            };
        });

        if (!items.length) {
            return res.status(404).json({ status: 'no_data', message: 'No aging records found' });
        }

        res.status(200).json({ status: 'success', agingData: items });
    } catch (error) {
        console.error('Payment Aging Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP aging service failed.' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
}); 
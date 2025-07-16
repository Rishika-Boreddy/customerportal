const express = require('express');
const axios = require('axios');
const { xml2js } = require('xml-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;


app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

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

  console.log('\n📤 Sending SOAP Request with:');
  console.log('CUS_ID:', CUS_ID);
  console.log('PASSWORD:', PASSWORD);
  console.log('SOAP Envelope:\n', soapEnvelope);

  try {
    const response = await axios.post(
      'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_rb?sap-client=100',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU', 
          'Cookie': 'sap-usercontext=sap-client=100',
        },
        responseType: 'text',
      }
    );

    console.log('\n📥 SAP Response Data:\n', response.data);

    const match = response.data.match(/<MESSAGE>(.*?)<\/MESSAGE>/i);
    const ev_status = (match && match[1]) ? match[1].trim() : 'Failed';

    console.log('✅ Extracted Status:', ev_status);

    if (ev_status.toLowerCase() === 'successful') {
      res.json({ status: 'success', message: ev_status });
    } else {
      res.status(401).json({ status: 'failed', message: ev_status });
    }

  } catch (error) {
    console.error('\n❌ AXIOS/SOAP CALL ERROR');
    console.error(error.response?.data || error.message);

    res.status(500).json({
      status: 'failed',
      message: 'SAP login service failed: ' + (error.response?.data || error.message),
    });
  }
});

// 📄 PROFILE API

app.post('/api/get-profile', async (req, res) => {
    console.log('--- /api/get-profile endpoint HIT ---');
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body.' });
    }

    const soapEnvelope = `
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

        const resultJSON = xml2js(response.data, { compact: true, spaces: 4 });

        const profile =
            resultJSON?.['soap-env:Envelope']?.['soap-env:Body']?.['n0:ZsdCustProfDetResponse']?.['EtCustProfile'];

        if (!profile) {
            return res.status(404).json({ status: 'no_data', message: 'No profile records found' });
        }

        const flatProfile = {
            CustomerId: profile.Kunnr?._text || null,
            Name1: profile.Name1?._text || null,
            Name2: profile.Name2?._text || null,
            Country: profile.Land1?._text || null,
            Phone: profile.Telf1?._text || null,
            Mandt: profile.Mandt?._text || null
        };

        res.status(200).json({ status: 'success', profileData: flatProfile });
    } catch (error) {
        console.error('Profile Fetch Error:', error.message);
        res.status(500).json({ status: 'failed', message: 'SAP profile service failed.' });
    }
});

// credit and debit

app.post('/api/memo', async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body.' });
    }

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

// delivery

app.post('/api/delivery', async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body.' });
    }

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
                    'Authorization': 'Basic SzkwMTQ3OTpSaXNoaWthQDI3MDU=', // 901479:Rishika@2705
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

//overall sales

app.post('/api/overall-sales', async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body.' });
    }

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

// inquiry

app.post('/api/inquiry', async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body' });
    }

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
                const tagMatch = itemXML.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
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

//sales-order:

app.post('/api/sales', async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body' });
    }

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

// payment and aging

app.post('/api/payment-aging', async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ status: 'failed', message: 'Missing customerId in request body' });
  }

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

// 🧾 INVOICE PDF API

app.post('/api/invoice-pdf', async (req, res) => {
    let { posnr, vbeln } = req.body;

    
    if (!vbeln || !posnr) {
        return res.status(400).json({
            status: 'E',
            error: 'Missing invoice number (vbeln) or item number (posnr)'
        });
    }

    
    vbeln = vbeln.padStart(10, '0');
    posnr = posnr.padStart(6, '0');

    const soapXML = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:ZcusInvPdf>
         <IvDoc>${vbeln}</IvDoc>
         <IvItem>${posnr}</IvItem>
      </urn:ZcusInvPdf>
   </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zcus_invo_serv?sap-client=100',
            soapXML,
            {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': ''
                },
                auth: {
                    username: 'K901479',
                    password: 'Rishika@2705'
                },
                timeout: 30000,
                responseType: 'text'
            }
        );

        const pdfMatch = response.data.match(/<XPdf>(.*?)<\/XPdf>/s);
        if (pdfMatch && pdfMatch[1]) {
            return res.json({ status: 'S', pdfBase64: pdfMatch[1] });
        }

        // NEW: Try to extract <PdfBase64String> if <XPdf> is not found
        const pdfBase64StringMatch = response.data.match(/<PdfBase64String>(.*?)<\/PdfBase64String>/s);
        if (pdfBase64StringMatch && pdfBase64StringMatch[1]) {
            return res.json({ status: 'S', pdfBase64: pdfBase64StringMatch[1] });
        }

        const parsed = xml2js.xml2js(response.data, {
            compact: true,
            ignoreDeclaration: true,
            ignoreAttributes: true
        });

        // Try to extract from parsed object as fallback
        let pdfBase64 = parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['n0:ZInvoicePdfGen1Response']?.XPdf?._text;
        if (!pdfBase64) {
            pdfBase64 = parsed?.['soap-env:Envelope']?.['soap-env:Body']?.['n0:ZcusInvPdfResponse']?.PdfBase64String?._text;
        }

        if (pdfBase64) {
            return res.json({ status: 'S', pdfBase64 });
        }

        res.json({
            status: 'E',
            error: 'No PDF content found in SAP response',
            responseData: response.data
        });

    } catch (error) {
        console.error('📛 Invoice PDF Generation Error:', {
            message: error.message,
            response: error.response?.data
        });
        res.status(500).json({
            status: 'E',
            error: 'Could not generate invoice PDF from SAP',
            details: error.message
        });
    }
});

// ✅ Start the server

const server = app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('❌ Server failed to start:', error.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});
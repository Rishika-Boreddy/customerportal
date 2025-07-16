import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface InquiryItem {
  CustomerId: string;
  CreatedDate: string;
  OrderType: string;
  StartDate: string;
  EndDate: string;
  SalesDocNo: string;
  ItemNo: string;
  ItemCategory: string | null;
  Description: string;
  NetValue: string;
  Currency: string;
  SalesUnit: string;
  Quantity: string;
}

@Component({
  standalone: true,
  selector: 'app-inquiry',
  imports: [CommonModule],
  templateUrl: './inquiry.component.html',
  styleUrls: ['./inquiry.component.css']
})
export class InquiryComponent implements OnInit {
  customerId = '';
  errorMessage = '';
  loading = false;
  inquiryData: InquiryItem[] = [];

  @ViewChild('tableBody', { static: false }) tableBody!: ElementRef<HTMLTableSectionElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const storedId = localStorage.getItem('CUS_ID');
    if (storedId) {
      this.customerId = storedId;
      this.fetchInquiryData();
    } else {
      this.showError('Customer ID not found. Please login again.');
    }
  }

  fetchInquiryData() {
    this.clearError();
    this.loading = true;

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const backendUrl = 'http://localhost:3000/api/inquiry';

    this.http.post<any>(backendUrl, { customerId: this.customerId }, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Inquiry response:', res);
        
        if (res.status === 'success' && res.inquiryData && res.inquiryData.length > 0) {
          this.inquiryData = res.inquiryData;
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            this.renderRows(res.inquiryData);
          }, 0);
        } else {
          this.showError(res.message || `No inquiry data found for Customer ID ${this.customerId}.`);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Inquiry Error:', err);
        this.showError(err.error?.message || 'Failed to fetch inquiry data. Please try again.');
      }
    });
  }

  renderRows(data: InquiryItem[]) {
    if (!this.tableBody?.nativeElement) {
      console.warn('Table body element not ready yet');
      return;
    }

    this.clearTable();
    data.forEach(item => {
      const tr = document.createElement('tr');
      // New order: Inquiry No, Item No, Description, Created Date, Doc Type, Binding Period, Sales Unit, Quantity, Currency, Amount
      const fields = [
        'SalesDocNo', // Inquiry No
        'ItemNo',     // Item No
        'Description',// Description
        'CreatedDate',// Created Date
        'OrderType',  // Doc Type
        'EndDate',    // Binding Period
        'SalesUnit',  // Sales Unit
        'Quantity',   // Quantity
        'Currency',   // Currency
        'NetValue'    // Amount
      ];
      fields.forEach((field, idx) => {
        const td = document.createElement('td');
        let value = item[field as keyof InquiryItem] ?? '-';
        // Rename NetValue to Amount in the table header, but value stays the same
        td.textContent = value;
        tr.appendChild(td);
      });
      this.tableBody.nativeElement.appendChild(tr);
    });
  }

  showError(message: string) {
    this.errorMessage = message;
  }

  clearError() {
    this.errorMessage = '';
  }

  clearTable() {
    if (this.tableBody?.nativeElement) {
      this.tableBody.nativeElement.innerHTML = '';
    }
  }

  refreshData() {
    this.fetchInquiryData();
  }
}

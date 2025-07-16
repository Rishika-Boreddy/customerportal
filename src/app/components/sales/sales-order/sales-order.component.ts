import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SalesOrderItem {
  SalesDoc: string;
  ItemNo: string;
  MaterialNo: string;
  Description: string;
  SalesType: string;
  CreatedOn: string;
  Quantity: string;
  DeliveryDate: string;
  PurchaseOrder: string;
  CustomerId: string;
  SalesUnit: string;
  NetValue: string;
  Currency: string;
  Division: string;
  ConfirmStatus: string;
  DeliveryStatus: string;
  StorageLoc: string | null;
}

@Component({
  selector: 'app-sales-order',
  standalone: true,
  templateUrl: './sales-order.component.html',
  styleUrls: ['./sales-order.component.css'],
  imports: [CommonModule, HttpClientModule, FormsModule]
})
export class SalesOrderComponent implements OnInit {
  customerId = '';
  salesOrders: SalesOrderItem[] = [];
  displayedOrders: SalesOrderItem[] = [];
  loading = false;
  errorMessage = '';

  // Sorting/filtering state
  sortField: keyof SalesOrderItem | '' = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  filterField: keyof SalesOrderItem | '' = '';
  filterValue: string = '';

  readonly fields: { key: keyof SalesOrderItem, label: string }[] = [
    { key: 'SalesDoc', label: 'Order #' },
    { key: 'ItemNo', label: 'Item No' },
    { key: 'MaterialNo', label: 'Material No' },
    { key: 'Description', label: 'Description' },
    { key: 'SalesType', label: 'Type' },
    { key: 'CreatedOn', label: 'Created On' },
    { key: 'Quantity', label: 'Quantity' },
    { key: 'DeliveryDate', label: 'Delivery Date' },
    { key: 'PurchaseOrder', label: 'PO No' },
    { key: 'SalesUnit', label: 'Unit' },
    { key: 'NetValue', label: 'Net Value' },
    { key: 'Currency', label: 'Currency' },
    { key: 'Division', label: 'Division' },
    { key: 'ConfirmStatus', label: 'Billing Status' },
    { key: 'DeliveryStatus', label: 'Delivery Status' },
    { key: 'StorageLoc', label: 'Storage Location' },
  ];

  @ViewChild('errorDiv', { static: true }) errorDiv!: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const storedId = localStorage.getItem('CUS_ID');
    if (storedId) {
      this.customerId = storedId;
      this.fetchSalesOrderData();
    } else {
      this.showError('Customer ID not found. Please login again.');
    }
  }

  fetchSalesOrderData() {
    this.clearError();
    this.loading = true;
    
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const backendUrl = 'http://localhost:3000/api/sales';

    this.http.post<any>(backendUrl, { customerId: this.customerId }, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Sales order response:', res);
        
        if (res.status === 'success' && res.salesData && res.salesData.length > 0) {
          // Remove preceding zeros from SalesDoc, ItemNo, and MaterialNo
          this.salesOrders = res.salesData.map((item: SalesOrderItem) => ({
            ...item,
            SalesDoc: item.SalesDoc ? item.SalesDoc.replace(/^0+/, '') : item.SalesDoc,
            ItemNo: item.ItemNo ? item.ItemNo.replace(/^0+/, '') : item.ItemNo,
            MaterialNo: item.MaterialNo ? item.MaterialNo.replace(/^0+/, '') : item.MaterialNo
            // CustomerId will be removed from display logic
          }));
          this.applySortAndFilter();
        } else {
          this.showError(res.message || `No sales order data found for Customer ID ${this.customerId}.`);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Sales Order Error:', err);
        this.showError(err.error?.message || 'Failed to fetch sales order data. Please try again.');
      }
    });
  }

  showError(message: string) {
    this.errorMessage = message;
    if (this.errorDiv) {
      this.errorDiv.nativeElement.textContent = message;
      this.errorDiv.nativeElement.style.display = 'block';
    }
  }

  clearError() {
    this.errorMessage = '';
    if (this.errorDiv) {
      this.errorDiv.nativeElement.textContent = '';
      this.errorDiv.nativeElement.style.display = 'none';
    }
  }

  refreshData() {
    this.fetchSalesOrderData();
  }

  // Sorting logic
  setSortField(field: keyof SalesOrderItem | '') {
    this.sortField = field;
    this.sortDirection = field ? 'asc' : '';
    this.applySortAndFilter();
  }

  setSortDirection(direction: 'asc' | 'desc') {
    this.sortDirection = direction;
    this.applySortAndFilter();
  }

  resetSort() {
    this.sortField = '';
    this.sortDirection = '';
    this.applySortAndFilter();
  }

  // Filtering logic
  setFilterField(field: keyof SalesOrderItem | '') {
    this.filterField = field;
    this.filterValue = '';
    this.applySortAndFilter();
  }

  setFilterValue(value: string) {
    this.filterValue = value;
    this.applySortAndFilter();
  }

  resetFilter() {
    this.filterField = '';
    this.filterValue = '';
    this.applySortAndFilter();
  }

  // For ngModel two-way binding
  get sortFieldModel() {
    return this.sortField;
  }
  set sortFieldModel(val: keyof SalesOrderItem | '') {
    this.setSortField(val);
  }

  get filterFieldModel() {
    return this.filterField;
  }
  set filterFieldModel(val: keyof SalesOrderItem | '') {
    this.setFilterField(val);
  }

  applySortAndFilter() {
    let data = [...this.salesOrders];
    // Filtering
    if (this.filterField && this.filterValue) {
      data = data.filter(item =>
        this.filterField && (item[this.filterField] !== undefined) &&
        (item[this.filterField]!.toString().toLowerCase().includes(this.filterValue.toLowerCase()))
      );
    }
    // Sorting
    if (this.sortField && this.sortDirection) {
      data.sort((a, b) => {
        const valA = this.sortField && a[this.sortField] !== undefined ? a[this.sortField]! : '';
        const valB = this.sortField && b[this.sortField] !== undefined ? b[this.sortField]! : '';
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.displayedOrders = data;
  }

  trackByIndex(index: number, item: SalesOrderItem) {
    return index;
  }
}

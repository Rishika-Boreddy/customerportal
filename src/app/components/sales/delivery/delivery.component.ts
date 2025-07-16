import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DeliveryItem {
  Vbeln: string;
  Posnr: string;
  Matnr: string;
  Arktx: string;
  Lfart: string;
  Lfdat: string;
  Kunnr: string;
  Vrkmer: string;
  Lfimg: string;
  Netwr: string;
  Waerk: string;
  Lgort: string;
  Bestk: string | null;
  Gbstk: string;
  Vstel: string;
  Werks: string;
}

@Component({
  standalone: true,
  selector: 'app-delivery',
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.css']
})
export class DeliveryComponent implements OnInit {
  customerId = '';
  errorMessage = '';
  loading = false;
  deliveryData: DeliveryItem[] = [];
  displayedData: DeliveryItem[] = [];

  // Sorting/filtering state
  sortField: keyof DeliveryItem | '' = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  filterField: keyof DeliveryItem | '' = '';
  filterValue: string = '';

  readonly fields: { key: keyof DeliveryItem, label: string }[] = [
    { key: 'Vbeln', label: 'Delivery No' },
    { key: 'Posnr', label: 'Item No' },
    { key: 'Matnr', label: 'Material No' },
    { key: 'Arktx', label: 'Description' },
    { key: 'Lfart', label: 'Type' },
    { key: 'Lfdat', label: 'Delivery Date' },
    { key: 'Kunnr', label: 'Customer ID' },
    { key: 'Vrkmer', label: 'Unit' },
    { key: 'Lfimg', label: 'Quantity' },
    { key: 'Netwr', label: 'Net Value' },
    { key: 'Waerk', label: 'Currency' },
    { key: 'Lgort', label: 'Storage Loc' },
    { key: 'Bestk', label: 'PO No' },
    { key: 'Gbstk', label: 'Billing Status' },
    { key: 'Vstel', label: 'Shipping Point' },
    { key: 'Werks', label: 'Plant' },
  ];

  @ViewChild('tableBody', { static: false }) tableBody!: ElementRef<HTMLTableSectionElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const storedId = localStorage.getItem('CUS_ID');
    if (storedId) {
      this.customerId = storedId;
      this.fetchDeliveryData();
    } else {
      this.showError('Customer ID not found. Please login again.');
    }
  }

  fetchDeliveryData() {
    this.clearError();
    this.loading = true;

    const backendUrl = 'http://localhost:3000/api/delivery';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post<any>(backendUrl, { customerId: this.customerId }, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Delivery response:', res);
        
        if (res.status === 'success' && res.deliveryData && res.deliveryData.length > 0) {
          this.deliveryData = res.deliveryData;
          this.applySortAndFilter();
        } else {
          this.showError(res.message || `No delivery data found for Customer ID ${this.customerId}.`);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Delivery Error:', err);
        this.showError(err.error?.message || 'Failed to fetch delivery data. Please try again.');
      }
    });
  }

  showError(message: string) {
    this.errorMessage = message;
  }

  clearError() {
    this.errorMessage = '';
  }

  refreshData() {
    this.fetchDeliveryData();
  }

  // Sorting logic
  setSortField(field: keyof DeliveryItem | '') {
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
  setFilterField(field: keyof DeliveryItem | '') {
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
  set sortFieldModel(val: keyof DeliveryItem | '') {
    this.setSortField(val);
  }

  get filterFieldModel() {
    return this.filterField;
  }
  set filterFieldModel(val: keyof DeliveryItem | '') {
    this.setFilterField(val);
  }

  applySortAndFilter() {
    let data = [...this.deliveryData];
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
    this.displayedData = data;
  }

  trackByIndex(index: number, item: DeliveryItem) {
    return index;
  }
}

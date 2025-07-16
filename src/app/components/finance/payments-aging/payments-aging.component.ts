import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-payments-aging',
  templateUrl: './payments-aging.component.html',
  styleUrls: ['./payments-aging.component.css'],
  imports: [CommonModule, FormsModule]
})
export class PaymentsAgingComponent implements OnInit {
  customerId = '';
  errorMessage = '';
  agingData: any[] = [];
  displayedData: any[] = [];

  // Sorting/filtering state
  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  filterField: string = '';
  filterValue: string = '';

  readonly fields: { key: string, label: string }[] = [
    { key: 'CustomerId', label: 'Customer ID' },
    { key: 'GraceDays', label: 'Grace Days' },
    { key: 'BillDate', label: 'Bill Date' },
    { key: 'DueDate', label: 'Due Date' },
    { key: 'PaymentDate', label: 'Payment Date' },
    { key: 'AgingDays', label: 'Aging Days' },
    { key: 'PaymentStatus', label: 'Payment Status' },
    { key: 'LastRemainder', label: 'Last Remainder' },
    { key: 'CollectionAgent', label: 'Collection Agent' },
    { key: 'Currency', label: 'Currency' },
    { key: 'Remarks', label: 'Remarks' },
  ];

  @ViewChild('tableBody', { static: true }) tableBody!: ElementRef<HTMLTableSectionElement>;
  @ViewChild('errorDiv', { static: true }) errorDiv!: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const storeId = localStorage.getItem('CUS_ID');
    if (storeId) {
      this.customerId = storeId;
      this.fetchPaymentsAgingData();
    } else {
      this.showError('Customer ID not found. Please login again.');
    }
  }

  fetchPaymentsAgingData() {
    this.clearError();
    this.clearTable();

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const backendUrl = 'http://localhost:3000/api/payment-aging';

    this.http.post<any>(backendUrl, { customerId: this.customerId }, { headers }).subscribe({
      next: (res) => {
        if (res.status === 'success' && res.agingData?.length > 0) {
          this.agingData = res.agingData;
          this.applySortAndFilter();
        } else {
          this.showError(`No payment aging data found for Customer ID ${this.customerId}.`);
        }
      },
      error: (err) => {
        this.showError('Failed to fetch data. ' + err.message);
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

  clearTable() {
    if (this.tableBody) {
      this.tableBody.nativeElement.innerHTML = '';
    }
  }

  // Sorting logic
  setSortField(field: string) {
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
  setFilterField(field: string) {
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
  set sortFieldModel(val: string) {
    this.setSortField(val);
  }

  get filterFieldModel() {
    return this.filterField;
  }
  set filterFieldModel(val: string) {
    this.setFilterField(val);
  }

  applySortAndFilter() {
    let data = [...this.agingData];
    // Filtering
    if (this.filterField && this.filterValue) {
      data = data.filter(item =>
        this.filterField && (item[this.filterField] !== undefined) &&
        (item[this.filterField]?.toString().toLowerCase().includes(this.filterValue.toLowerCase()))
      );
    }
    // Sorting
    if (this.sortField && this.sortDirection) {
      data.sort((a, b) => {
        const valA = this.sortField && a[this.sortField] !== undefined ? a[this.sortField] : '';
        const valB = this.sortField && b[this.sortField] !== undefined ? b[this.sortField] : '';
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.displayedData = data;
  }

  trackByIndex(index: number, item: any) {
    return index;
  }
}

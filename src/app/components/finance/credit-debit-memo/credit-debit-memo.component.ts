import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-credit-debit-memo',
  templateUrl: './credit-debit-memo.component.html',
  styleUrls: ['./credit-debit-memo.component.css'],
  imports: [CommonModule, FormsModule]
})
export class CreditDebitMemoComponent implements OnInit {
  customerId: string = '';
  errorMessage = '';
  memoData: any[] = [];
  displayedData: any[] = [];

  // Sorting/filtering state
  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  filterField: string = '';
  filterValue: string = '';

  readonly fields: { key: string, label: string }[] = [
    { key: 'BillDocNo', label: 'Bill Doc No' },
    { key: 'BillType', label: 'Type' },
    { key: 'BillDate', label: 'Date' },
    { key: 'SalesOrg', label: 'Sales Org' },
    { key: 'CustomerId', label: 'Customer ID' },
    { key: 'NetVal', label: 'Net Value' },
    { key: 'Currency', label: 'Currency' },
    { key: 'MatNo', label: 'Material No' },
    { key: 'Quantity', label: 'Quantity' },
    { key: 'SalesUnit', label: 'Sales Unit' },
  ];

  @ViewChild('tableBody', { static: true }) tableBody!: ElementRef<HTMLTableSectionElement>;
  @ViewChild('errorDiv', { static: true }) errorDiv!: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const storedId = localStorage.getItem('CUS_ID');
    if (storedId) {
      this.customerId = storedId;
      this.fetchCreditDebitMemos();
    } else {
      this.showError('Customer ID not found. Please log in again.');
    }
  }

  fetchCreditDebitMemos() {
    this.clearError();
    this.clearTable();

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const url = 'http://localhost:3000/api/memo';

    this.http.post<any>(url, { customerId: this.customerId }, { headers }).subscribe({
      next: (res) => {
        if (res.memoData && res.memoData.length > 0) {
          this.memoData = res.memoData;
          this.applySortAndFilter();
        } else {
          this.showError(`No memo data found for Customer ID: ${this.customerId}`);
        }
      },
      error: (err) => {
        this.showError('Failed to fetch memo data. ' + err.message);
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
    let data = [...this.memoData];
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

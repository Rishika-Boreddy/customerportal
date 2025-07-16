import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule, HttpClientModule, CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  customerId: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  onSubmit() {
    if (this.customerId && this.password) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const payload = {
        CUS_ID: this.customerId,
        PASSWORD: this.password,
      };
      console.log('Submitting login with payload:', payload);

      this.http.post<any>('http://localhost:3000/api/login', payload).subscribe({
        next: (response) => {
          console.log('Login response:', response);
          this.isLoading = false;
          
          if (response.status === 'success') {
            // Store customer ID with consistent key
            localStorage.setItem('CUS_ID', this.customerId);
            // Navigate to dashboard on successful login
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = response.message || 'Invalid Customer ID or Password';
          }
        },
        error: (error) => {
          console.error('Login failed:', error);
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        },
      });
    } else {
      this.errorMessage = 'Please enter both Customer ID and Password';
    }
  }
}

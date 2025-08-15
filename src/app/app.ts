import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './components/game/game';
import { InferenceService } from './services/inference.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Who am I?';
  isLoading = true;
  loadingStatus = 'Initializing...';
  private subscription: Subscription | null = null;

  constructor(private inferenceService: InferenceService) {}

  ngOnInit(): void {
    this.subscription = this.inferenceService.getInitializationStatus().subscribe(status => {
      this.loadingStatus = status;
      if (status === 'Ready') {
        this.isLoading = false;
      } else if (status === 'Failed to initialize') {
        this.isLoading = false;
        // You might want to show an error message here
      }
    });

    // Start initializing the model
    this.inferenceService.initializeEngine().catch(error => {
      console.error('Failed to initialize model:', error);
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

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
  isLoading = false;
  loadingStatus = 'Initializing...';
  private subscription: Subscription | null = null;

  constructor(private inferenceService: InferenceService) {}

  ngOnInit(): void {
    // this.inferenceService.initializeEngine('SmolLM2-1.7B-Instruct-q4f16_1-MLC');
    this.inferenceService.initializeEngine('Qwen2.5-7B-Instruct-q4f16_1-MLC'); 
    // this.inferenceService.initializeEngine('SmolLM2-360M-Instruct-q0f16-MLC');

    this.subscription = this.inferenceService.getInitializationStatus().subscribe(status => {
      if(status.status === 'NOT_INITIALIZED') {
        this.isLoading = false;
        this.loadingStatus = 'Not initialized';
        return;
      }

      this.loadingStatus = status.progress.text;
      this.isLoading = status.status !== 'READY';
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';

export interface InferenceResponse {
  content: string;
  success: boolean;
  error?: string;
}

export interface InferenceStatus {
  status: 'NOT_INITIALIZED' | 'INITIALIZING' | 'READY' | 'FAILED';
  progress: any;
}

@Injectable({
  providedIn: 'root'
})
export class InferenceService {
  private engine: any = null;
  private isInitialized = false;
  private isInitializing = false;
  private initializationStatus = new BehaviorSubject<InferenceStatus>({status: 'NOT_INITIALIZED', progress: {text: '', progress: 0, timeElapsed: 0}});

  constructor() {}

  /**
   * Initialize the WebLLM engine with lazy loading
   */
  async initializeEngine(model: string): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    this.initializationStatus.next({status: 'INITIALIZING', progress: {text: 'Loading ML library...', progress: 0, timeElapsed: 0}});

    try {
      // Dynamically import the ML library
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      
      this.initializationStatus.next({status: 'INITIALIZING', progress: {text: 'Initializing engine...', progress: 0.3, timeElapsed: 0}});

      // Create the MLCEngine with default configuration
      this.engine = await CreateMLCEngine(model, {
        initProgressCallback: (progress: any) => {
          // Update the status with more detailed progress information
          if (progress.text) {
            this.initializationStatus.next({status: 'INITIALIZING', progress: {text: `Loading: ${progress.text}`, progress: progress.progress, timeElapsed: progress.timeElapsed}});
          }
        }
      });
      
      this.isInitialized = true;
      this.initializationStatus.next({status: 'READY', progress: {text: 'Ready', progress: 1, timeElapsed: 0}});
      console.log('WebLLM engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize WebLLM engine:', error);
      this.initializationStatus.next({status: 'FAILED', progress: {text: 'Failed to initialize', progress: 0, timeElapsed: 0}});
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get the current initialization status
   */
  getInitializationStatus(): Observable<InferenceStatus> {
    return this.initializationStatus.asObservable();
  }

  /**
   * Check if the engine is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  async makeInferenceCall(params: any): Promise<any> {
    if (!this.isReady()) {
        throw new Error('Engine not initialized');
      }

      if (!this.engine) {
        throw new Error('Engine not available');
      }
      
    return this.engine.chat.completions.create(params);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
        this.engine = null;
        this.isInitialized = false;
        this.initializationStatus.next({status: 'NOT_INITIALIZED', progress: {text: 'Not initialized', progress: 0, timeElapsed: 0}});
        console.log('WebLLM engine cleaned up');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }
}

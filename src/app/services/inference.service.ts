import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, ChatCompletionRequestNonStreaming, ChatCompletion } from '@mlc-ai/web-llm';

export interface InferenceResponse {
  content: string;
  success: boolean;
  error?: string;
}



@Injectable({
  providedIn: 'root'
})
export class InferenceService {
  private engine: MLCEngineInterface | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initializationStatus = new BehaviorSubject<string>('Not initialized');

  constructor() {}

  /**
   * Initialize the WebLLM engine
   */
  async initializeEngine(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    this.initializationStatus.next('Initializing...');

    try {
      // Create the MLCEngine with default configuration
      this.engine = await CreateMLCEngine("SmolLM2-1.7B-Instruct-q4f16_1-MLC", {
        initProgressCallback: (progress) => {
        //   console.log('Progress:', progress);
          // Update the status with more detailed progress information
          if (progress.text) {
            this.initializationStatus.next(`Loading: ${progress.text}`);
          }
        }
      });
      
      this.isInitialized = true;
      this.initializationStatus.next('Ready');
      console.log('WebLLM engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize WebLLM engine:', error);
      this.initializationStatus.next('Failed to initialize');
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get the current initialization status
   */
  getInitializationStatus(): Observable<string> {
    return this.initializationStatus.asObservable();
  }

  /**
   * Check if the engine is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  async makeInferenceCall(params: ChatCompletionRequestNonStreaming): Promise<ChatCompletion> {
    if (!this.isReady()) {
        await this.initializeEngine();
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
        this.initializationStatus.next('Not initialized');
        console.log('WebLLM engine cleaned up');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }
}

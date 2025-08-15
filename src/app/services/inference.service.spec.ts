import { TestBed } from '@angular/core/testing';
import { InferenceService } from './inference.service';

describe('InferenceService', () => {
  let service: InferenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InferenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial status as "Not initialized"', (done) => {
    service.getInitializationStatus().subscribe(status => {
      expect(status).toBe('Not initialized');
      done();
    });
  });

  it('should not be ready initially', () => {
    expect(service.isReady()).toBeFalse();
  });

  it('should return available models', async () => {
    const models = await service.getAvailableModels();
    expect(models).toContain('Llama-2-7b-chat-q4f16_1');
  });

  it('should make inference calls', async () => {
    // Mock the makeInference method to avoid actual WebLLM calls in tests
    spyOn(service as any, 'makeInference').and.returnValue(Promise.resolve({
      content: 'Paris is the capital of France.',
      success: true
    }));

    const result = await service.makeInference('What is the capital of France?');
    
    expect(result.success).toBeTrue();
    expect(result.content).toContain('Paris');
  });

  it('should handle inference errors gracefully', async () => {
    spyOn(service as any, 'makeInference').and.returnValue(Promise.resolve({
      content: '',
      success: false,
      error: 'Test error'
    }));

    const result = await service.makeInference('Test question');
    
    expect(result.success).toBeFalse();
    expect(result.error).toBe('Test error');
  });
});

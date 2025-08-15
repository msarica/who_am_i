import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { InferenceService, InferenceResponse } from './inference.service';
import { ChatCompletion } from '@mlc-ai/web-llm';

export interface GameResponse {
  result: 'YES' | 'NO' | 'NOT_VALID';
  win: boolean;
  reasoning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private character: string = '';
  private theme: string = 'disney';
  private gameStarted: boolean = false;

  constructor(private inferenceService: InferenceService) { }

  async startGame(): Promise<void> {
    // Wait for the inference service to be ready
    if (!this.inferenceService.isReady()) {
      throw new Error('Inference service is not ready. Please wait for the model to load.');
    }
    await this.selectCharacter();
  }

  private async selectCharacter(): Promise<void> {
    const result = await this.inferenceService.makeInferenceCall({
      messages: [
        { role: 'system', content: `You are a helpful assistant to a game called "Who Am I?".
        You are given a question and you must respond with the name of the main character and nothing else.
        You must respond with the name of one character and nothing else.` },
        { role: 'user', content: `Pick a character from the theme "${this.theme}".` }
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false
    });
    // console.log(result);
    this.character = result.choices[0]?.message?.content || '';
    console.log(this.character);
    this.gameStarted = true;
  }

  isGameStarted(): boolean {
    return this.gameStarted;
  }

  getCharacter(): string {
    return this.character;
  }

  setCharacter(character: string): void {
    this.character = character;
  }

  async askQuestion(question: string): Promise<GameResponse> {
    if (!this.gameStarted) {
      throw new Error('Game not started');
    }

    // Use the inference service to process the question with game-specific prompt
    const systemPrompt = `You are playing a "Who Am I?" game. The character is "${this.character}" and the theme is "${this.theme}". 
    The player asks yes/no questions to guess the character. 
    You must respond with a reasoning and an answer in the following format:
    <response>
      <reasoning> very short reasoning </reasoning>
      <answer> answer to the question YES|NO|NOT_VALID </answer>
    </response>`;

    const fullPrompt = `<question>${question}</question>`;

    const response = await this.inferenceService.makeInferenceCall({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false
    });

    return this.parseResponse(response);
  }

  private parseResponse(response: ChatCompletion): GameResponse {  
    // Parse the response to extract the result
    const content = response.choices[0]?.message?.content || '';

    console.log(content);
    const contentLower = content.toLowerCase();
    let result: 'YES' | 'NO' | 'NOT_VALID' = 'NOT_VALID';
    let win = false;

    // Extract answer from XML-like tags if present
    const answerMatch = content.match(/<answer>(YES|NO|NOT_VALID)<\/answer>/i);
    if (answerMatch) {
      result = answerMatch[1] as 'YES' | 'NO' | 'NOT_VALID';
    } else {
      // Fallback to simple text parsing
      if (contentLower.includes('yes') && !contentLower.includes('no')) {
        result = 'YES';
      } else if (contentLower.includes('no') && !contentLower.includes('yes')) {
        result = 'NO';
      }
    }

    // Extract reasoning from XML-like tags if present
    const reasoningMatch = content.match(/<reasoning>(.*?)<\/reasoning>/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : content;

    // Determine if this helps the player win (more sophisticated logic)
    const helpfulKeywords = ['helpful', 'useful', 'good question', 'clue', 'hint', 'narrow'];
    win = helpfulKeywords.some(keyword => contentLower.includes(keyword));

    return {
      result,
      win,
      reasoning
    };
  }

  resetGame(): void {
    this.gameStarted = false;
  }

  /**
   * Get the initialization status of the inference service
   */
  getInferenceStatus(): Observable<string> {
    return this.inferenceService.getInitializationStatus();
  }

  /**
   * Check if the inference service is ready
   */
  isInferenceReady(): boolean {
    return this.inferenceService.isReady();
  }
}

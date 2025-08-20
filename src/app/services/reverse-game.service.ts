import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { InferenceService, InferenceResponse, InferenceStatus } from './inference.service';
import { ChatCompletion } from '@mlc-ai/web-llm';
import dedent from 'dedent';

export interface ReverseGameResponse {
  result: 'QUESTION' | 'GUESS' | 'ERROR';
  question?: string;
  guess?: string;
  reasoning?: string;
}

export interface AnswerResponse {
  result: 'YES' | 'NO' | 'IRRELEVANT' | 'ERROR';
  reasoning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReverseGameService {
  private gameStarted: boolean = false;
  private questionHistory: Array<{question: string, answer: 'YES' | 'NO' | 'IRRELEVANT'}> = [];
  private currentQuestion: string = '';
  private gameCount: number = 0;

  public gameWin$ = new Subject<boolean>();

  constructor(private inferenceService: InferenceService) { }

  async startGame(): Promise<ReverseGameResponse> {
    // Wait for the inference service to be ready
    if (!this.inferenceService.isReady()) {
      throw new Error('Inference service is not ready. Please wait for the model to load.');
    }
    
    this.gameStarted = true;
    this.questionHistory = [];
    this.gameCount++;
    
    // Generate the first question
    return this.generateQuestion();
  }

  async generateQuestion(): Promise<ReverseGameResponse> {
    if (!this.gameStarted) {
      throw new Error('Game not started');
    }

    const gameCount = this.gameCount;
    
    const systemPrompt = dedent`You are playing a reverse "Who Am I?" game. The user is thinking of a character (could be from movies, books, real life, etc.) and you need to ask yes/no questions to guess who they are thinking of.
    
    You should ask strategic questions that help narrow down the possibilities. Consider the previous questions and answers when formulating your next question.
    
    Previous questions and answers:
    ${this.questionHistory.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')}
    
    Ask one clear yes/no question that will help you identify the character. The question should be specific and strategic.
    
    Use the following format:
    <REASONING> brief reasoning for this question </REASONING>
    <QUESTION> your yes/no question </QUESTION>
    `;

    try {
      const response = await this.inferenceService.makeInferenceCall({
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      });

      if (gameCount !== this.gameCount) {
        return {
          result: 'ERROR',
          reasoning: 'Game was reset'
        };
      }

      return this.parseQuestionResponse(response);
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        result: 'ERROR',
        reasoning: 'Failed to generate question'
      };
    }
  }

  async answerQuestion(answer: 'YES' | 'NO' | 'IRRELEVANT'): Promise<ReverseGameResponse> {
    if (!this.gameStarted || !this.currentQuestion) {
      throw new Error('Game not started or no current question');
    }

    const gameCount = this.gameCount;
    
    // Add the question and answer to history
    this.questionHistory.push({
      question: this.currentQuestion,
      answer: answer
    });

    // Check if we should make a guess
    if (this.questionHistory.length >= 3) {
      const shouldGuess = await this.shouldMakeGuess();
      if (shouldGuess) {
        return this.makeGuess();
      }
    }

    // Generate next question
    return this.generateQuestion();
  }

  private async shouldMakeGuess(): Promise<boolean> {
    const systemPrompt = dedent`You are playing a reverse "Who Am I?" game. Based on the questions asked and answers received, determine if you have enough information to make a reasonable guess.
    
    Questions and answers:
    ${this.questionHistory.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')}
    
    Respond with YES if you have enough information to make a confident guess, or NO if you need more questions.
    
    Use the following format:
    <REASONING> brief reasoning </REASONING>
    <SHOULD_GUESS> YES|NO </SHOULD_GUESS>
    `;

    try {
      const response = await this.inferenceService.makeInferenceCall({
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
        stream: false
      });

      const content = response.choices[0]?.message?.content || '';
      const guessMatch = content.match(/<SHOULD_GUESS>\s*(YES|NO)\s*<\/SHOULD_GUESS>/i);
      
      return guessMatch ? guessMatch[1] === 'YES' : false;
    } catch (error) {
      console.error('Error determining if should guess:', error);
      return false;
    }
  }

  private async makeGuess(): Promise<ReverseGameResponse> {
    const systemPrompt = dedent`You are playing a reverse "Who Am I?" game. Based on the questions asked and answers received, make your best guess at who the user is thinking of.
    
    Questions and answers:
    ${this.questionHistory.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')}
    
    Make your best guess at the character. Be specific and confident.
    
    Use the following format:
    <REASONING> brief reasoning for your guess </REASONING>
    <GUESS> your guess (character name) </GUESS>
    `;

    try {
      const response = await this.inferenceService.makeInferenceCall({
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      });

      return this.parseGuessResponse(response);
    } catch (error) {
      console.error('Error making guess:', error);
      return {
        result: 'ERROR',
        reasoning: 'Failed to make guess'
      };
    }
  }

  async confirmGuess(isCorrect: boolean): Promise<void> {
    if (isCorrect) {
      this.gameWin$.next(true);
    } else {
      // Continue asking questions
      this.generateQuestion();
    }
  }

  private parseQuestionResponse(response: ChatCompletion): ReverseGameResponse {
    const content = response.choices[0]?.message?.content || '';
    
    const reasoningMatch = content.match(/<REASONING>\s*(.*?)\s*<\/REASONING>/i);
    const questionMatch = content.match(/<QUESTION>\s*(.*?)\s*<\/QUESTION>/i);
    
    if (questionMatch) {
      this.currentQuestion = questionMatch[1].trim();
      return {
        result: 'QUESTION',
        question: this.currentQuestion,
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : undefined
      };
    }
    
    return {
      result: 'ERROR',
      reasoning: 'Failed to parse question response'
    };
  }

  private parseGuessResponse(response: ChatCompletion): ReverseGameResponse {
    const content = response.choices[0]?.message?.content || '';
    
    const reasoningMatch = content.match(/<REASONING>\s*(.*?)\s*<\/REASONING>/i);
    const guessMatch = content.match(/<GUESS>\s*(.*?)\s*<\/GUESS>/i);
    
    if (guessMatch) {
      return {
        result: 'GUESS',
        guess: guessMatch[1].trim(),
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : undefined
      };
    }
    
    return {
      result: 'ERROR',
      reasoning: 'Failed to parse guess response'
    };
  }

  isGameStarted(): boolean {
    return this.gameStarted;
  }

  getQuestionHistory(): Array<{question: string, answer: 'YES' | 'NO' | 'IRRELEVANT'}> {
    return [...this.questionHistory];
  }

  resetGame(): void {
    this.gameStarted = false;
    this.questionHistory = [];
    this.currentQuestion = '';
  }

  /**
   * Get the initialization status of the inference service
   */
  getInferenceStatus(): Observable<InferenceStatus> {
    return this.inferenceService.getInitializationStatus();
  }

  /**
   * Check if the inference service is ready
   */
  isInferenceReady(): boolean {
    return this.inferenceService.isReady();
  }
}

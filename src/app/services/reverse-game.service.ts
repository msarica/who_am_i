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
  result: 'YES' | 'NO' | 'I_DONT_KNOW' | 'ERROR';
  reasoning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReverseGameService {
  private gameStarted: boolean = false;
  private questionHistory: Array<{question: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW'}> = [];
  private currentQuestion: string = '';
  private gameCount: number = 0;
  private summary: string = '';

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
    this.summary = '';
    
    // Generate the first question
    return this.generateQuestion();
  }

  async summarizeWhatWeKnow(): Promise<void> {
    const systemPrompt = dedent`You are playing a "Who Am I?" game with a young child.

    Summary of what we know so far:
    ${this.summary}

    Last questions and answers:
    ${this.questionHistory.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')}
    `;

    const response = await this.inferenceService.makeInferenceCall({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Summarize what we know about the character in a few sentences.' }
      ],
      temperature: 0.7,
      max_tokens: 200,
      stream: false
    });

    const content = response.choices[0]?.message?.content || '';

    console.log('Summary:', content);
    this.summary = content;
    this.questionHistory = [];
  }

  async generateQuestion(): Promise<ReverseGameResponse> {
    if (!this.gameStarted) {
      throw new Error('Game not started');
    }

    const systemPrompt = dedent`You are playing a "Who Am I?" game with a young child. The user is thinking of a character (could be from movies, books, real life, etc.) and you need to ask yes/no questions to guess who they are thinking of.
    You should ask strategic questions that help narrow down the possibilities. Consider the previous questions and answers when formulating your next question.
    Summary of what we know:
    ${this.summary}

    Last questions and answers:
    ${this.questionHistory.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')}
    
    Ask one clear yes/no question that will help you identify the character. The question should be short, specific and strategic.
    `;

    try {
      const response = await this.inferenceService.makeInferenceCall({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'What should I ask next?' }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      });

      const content = response.choices[0]?.message?.content || '';

      console.log(content);
    
      this.currentQuestion = content;
      return {
        result: 'QUESTION',
        question: this.currentQuestion,
        reasoning: undefined
      };
    
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        result: 'ERROR',
        reasoning: 'Failed to generate question'
      };
    }
  }

  async answerQuestion(answer: 'YES' | 'NO' | 'I_DONT_KNOW'): Promise<ReverseGameResponse> {
    if (!this.gameStarted || !this.currentQuestion) {
      throw new Error('Game not started or no current question');
    }

    const gameCount = this.gameCount;
    
    // Add the question and answer to history
    this.questionHistory.push({
      question: this.currentQuestion,
      answer: answer
    });

    if(this.questionHistory.length > 0 && this.questionHistory.length % 10 === 0) {
      await this.summarizeWhatWeKnow();
    }

    // Generate next question
    return this.generateQuestion();
  }

  async removeAnswer(question: string): Promise<void> {
    this.questionHistory = this.questionHistory.filter(q => q.question !== question);
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

  getQuestionHistory(): Array<{question: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW'}> {
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

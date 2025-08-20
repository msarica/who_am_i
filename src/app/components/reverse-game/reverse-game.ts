import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReverseGameService, ReverseGameResponse } from '../../services/reverse-game.service';

interface GameMessage {
  text: string;
  isAI: boolean;
  timestamp: Date;
  type: 'question' | 'guess' | 'instruction';
  response?: ReverseGameResponse;
}

@Component({
  selector: 'app-reverse-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reverse-game.html',
  styleUrl: './reverse-game.css'
})
export class ReverseGameComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessagesContainer', { static: false }) chatMessagesContainer!: ElementRef;
  @Output() switchToClassicGame = new EventEmitter<void>();
  
  chatMessages: GameMessage[] = [];
  isLoading: boolean = false;
  showWinModal: boolean = false;
  showGuessModal: boolean = false;
  currentGuess: string = '';
  private shouldScrollToBottom: boolean = false;

  constructor(
    private reverseGameService: ReverseGameService,
  ) {}

  ngOnInit(): void {
    this.reverseGameService.gameWin$.subscribe((isWon) => {
      if(isWon) {
        console.log('Game won!');
        this.showWinModal = true;
      }
    });
    
    // Auto-start the game when component is initialized
    this.startGame();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatMessagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async startGame(): Promise<void> {
    try {
      this.isLoading = true;
      this.showWinModal = false;
      this.showGuessModal = false;
      this.chatMessages = [];
      
      // Add initial instruction message
      const instructionMessage: GameMessage = {
        text: 'Think of a character (from movies, books, real life, etc.) and I will try to guess who you are thinking of by asking you yes/no questions!',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(instructionMessage);
      this.shouldScrollToBottom = true;
      
      const response = await this.reverseGameService.startGame();
      
      // Handle the first question response
      if (response.result === 'QUESTION' && response.question) {
        const questionMessage: GameMessage = {
          text: response.question,
          isAI: true,
          timestamp: new Date(),
          type: 'question',
          response: response
        };
        this.chatMessages.push(questionMessage);
        this.shouldScrollToBottom = true;
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      const errorMessage: GameMessage = {
        text: 'Failed to start game. Please make sure the AI model is loaded.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
    }
  }

  private async generateQuestion(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.reverseGameService.generateQuestion();
      
      if (response.result === 'QUESTION' && response.question) {
        const questionMessage: GameMessage = {
          text: response.question,
          isAI: true,
          timestamp: new Date(),
          type: 'question',
          response: response
        };
        this.chatMessages.push(questionMessage);
        this.shouldScrollToBottom = true;
      } else if (response.result === 'ERROR') {
        const errorMessage: GameMessage = {
          text: 'Sorry, I encountered an error. Please try again.',
          isAI: true,
          timestamp: new Date(),
          type: 'instruction'
        };
        this.chatMessages.push(errorMessage);
        this.shouldScrollToBottom = true;
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
      const errorMessage: GameMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
    }
  }

  async answerQuestion(answer: 'YES' | 'NO' | 'IRRELEVANT'): Promise<void> {
    if (this.isLoading) return;

    // Add user's answer to chat
    const answerText = answer === 'IRRELEVANT' ? 'Irrelevant' : answer;
    const userMessage: GameMessage = {
      text: answerText,
      isAI: false,
      timestamp: new Date(),
      type: 'question'
    };
    this.chatMessages.push(userMessage);
    this.shouldScrollToBottom = true;

    try {
      this.isLoading = true;
      const response = await this.reverseGameService.answerQuestion(answer);
      
      if (response.result === 'QUESTION' && response.question) {
        // AI asks another question
        const questionMessage: GameMessage = {
          text: response.question,
          isAI: true,
          timestamp: new Date(),
          type: 'question',
          response: response
        };
        this.chatMessages.push(questionMessage);
        this.shouldScrollToBottom = true;
      } else if (response.result === 'GUESS' && response.guess) {
        // AI makes a guess
        this.currentGuess = response.guess;
        const guessMessage: GameMessage = {
          text: `I think you're thinking of: ${response.guess}`,
          isAI: true,
          timestamp: new Date(),
          type: 'guess',
          response: response
        };
        this.chatMessages.push(guessMessage);
        this.shouldScrollToBottom = true;
        this.showGuessModal = true;
      } else if (response.result === 'ERROR') {
        const errorMessage: GameMessage = {
          text: 'Sorry, I encountered an error. Please try again.',
          isAI: true,
          timestamp: new Date(),
          type: 'instruction'
        };
        this.chatMessages.push(errorMessage);
        this.shouldScrollToBottom = true;
      }
    } catch (error) {
      console.error('Failed to process answer:', error);
      const errorMessage: GameMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
    }
  }

  async confirmGuess(isCorrect: boolean): Promise<void> {
    this.showGuessModal = false;
    
    if (isCorrect) {
      const winMessage: GameMessage = {
        text: 'Great! I guessed correctly! 🎉',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(winMessage);
      this.shouldScrollToBottom = true;
      this.reverseGameService.gameWin$.next(true);
    } else {
      const continueMessage: GameMessage = {
        text: 'Okay, let me ask more questions to figure it out!',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.chatMessages.push(continueMessage);
      this.shouldScrollToBottom = true;
      
      // Continue with more questions
      await this.generateQuestion();
    }
  }

  closeWinModal(): void {
    this.startGame();
  }

  switchToClassic(): void {
    this.switchToClassicGame.emit();
  }

  closeGuessModal(): void {
    this.showGuessModal = false;
  }

  isLastAIMessage(index: number): boolean {
    // Find the last AI message index
    for (let i = this.chatMessages.length - 1; i >= 0; i--) {
      if (this.chatMessages[i].isAI) {
        return i === index;
      }
    }
    return false;
  }

  getMessageClass(message: GameMessage): string {
    if (message.isAI) {
      return 'ai-message';
    } else {
      return 'user-message';
    }
  }

  getLastAIMessageIndex(): number {
    for (let i = this.chatMessages.length - 1; i >= 0; i--) {
      if (this.chatMessages[i].isAI) {
        return i;
      }
    }
    return -1;
  }

  trackByIndex(index: number): number {
    return index;
  }
}

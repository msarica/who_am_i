import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Output, EventEmitter, OnDestroy } from '@angular/core';
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
export class ReverseGameComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatMessagesContainer', { static: false }) chatMessagesContainer!: ElementRef;
  @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef;
  @Output() switchToClassicGame = new EventEmitter<void>();
  
  chatMessages: GameMessage[] = [];
  isLoading: boolean = false;
  showWinModal: boolean = false;
  showGuessModal: boolean = false;
  currentGuess: string = '';
  private shouldScrollToBottom: boolean = false;
  private scrollTimeout: any;

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
    
    // Handle loading state changes
    this.onLoadingChange();
  }

  ngOnDestroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  private scrollToBottom(): void {
    try {
      if (!this.chatContainer) {
        console.warn('Chat container not available');
        return;
      }
      
      const element = this.chatContainer.nativeElement;
      // console.log('Scrolling to bottom, scrollHeight:', element.scrollHeight);
      
      // Clear any existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      
      // Use setTimeout to ensure DOM is fully updated
      this.scrollTimeout = setTimeout(() => {
        element.scrollTop = element.scrollHeight;
        // console.log('Scrolled to:', element.scrollTop);
      }, 50);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  // Force scroll to bottom immediately (for immediate response)
  private forceScrollToBottom(): void {
    try {
      if (!this.chatContainer) {
        return;
      }
      const element = this.chatContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error forcing scroll to bottom:', err);
    }
  }

  // Helper method to add message and trigger scroll
  private addMessageWithScroll(message: GameMessage): void {
    this.chatMessages.push(message);
    this.shouldScrollToBottom = true;
    
    // Force immediate scroll for better responsiveness
    setTimeout(() => {
      this.forceScrollToBottom();
    }, 10);
  }

  // Handle manual scroll events
  onChatScroll(event: any): void {
    const element = event.target;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    
    // Only auto-scroll if user is near the bottom
    if (!isAtBottom) {
      this.shouldScrollToBottom = false;
    }
  }

  // Handle loading state changes
  onLoadingChange(): void {
    if (this.isLoading) {
      setTimeout(() => {
        this.forceScrollToBottom();
      }, 100);
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
      this.addMessageWithScroll(instructionMessage);
      
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
        this.addMessageWithScroll(questionMessage);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      const errorMessage: GameMessage = {
        text: 'Failed to start game. Please make sure the AI model is loaded.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.addMessageWithScroll(errorMessage);
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
        this.addMessageWithScroll(questionMessage);
      } else if (response.result === 'ERROR') {
        const errorMessage: GameMessage = {
          text: 'Sorry, I encountered an error. Please try again.',
          isAI: true,
          timestamp: new Date(),
          type: 'instruction'
        };
        this.addMessageWithScroll(errorMessage);
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
      const errorMessage: GameMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.addMessageWithScroll(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async answerQuestion(answer: 'YES' | 'NO' | 'I_DONT_KNOW'): Promise<void> {
    if (this.isLoading) return;

    // Add user's answer to chat
    const answerText = answer === 'I_DONT_KNOW' ? 'I don\'t know' : answer;
    const userMessage: GameMessage = {
      text: answerText,
      isAI: false,
      timestamp: new Date(),
      type: 'question'
    };
    this.addMessageWithScroll(userMessage);

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
        this.addMessageWithScroll(questionMessage);
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
        this.addMessageWithScroll(guessMessage);
        this.showGuessModal = true;
      } else if (response.result === 'ERROR') {
        const errorMessage: GameMessage = {
          text: 'Sorry, I encountered an error. Please try again.',
          isAI: true,
          timestamp: new Date(),
          type: 'instruction'
        };
        this.addMessageWithScroll(errorMessage);
      }
    } catch (error) {
      console.error('Failed to process answer:', error);
      const errorMessage: GameMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isAI: true,
        timestamp: new Date(),
        type: 'instruction'
      };
      this.addMessageWithScroll(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async gameWon(): Promise<void> {
    this.showGuessModal = false;

    this.reverseGameService.gameWin$.next(true);
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

  canRemoveAnswer(answerIndex: number): boolean {
    // Check if this is a user answer and there's a previous AI question
    if (answerIndex <= 0 || answerIndex >= this.chatMessages.length) {
      return false;
    }
    
    const currentMessage = this.chatMessages[answerIndex];
    const previousMessage = this.chatMessages[answerIndex - 1];
    
    // Check if current message is user answer and previous is AI question
    return !currentMessage.isAI && 
           currentMessage.type === 'question' && 
           previousMessage.isAI && 
           previousMessage.type === 'question';
  }

  removeAnswer(answerIndex: number): void {
    if (!this.canRemoveAnswer(answerIndex) || this.isLoading) {
      return;
    }

    this.reverseGameService.removeAnswer(this.chatMessages[answerIndex].text);
    
    // Remove both the question (previous message) and the answer (current message)
    this.chatMessages.splice(answerIndex - 1, 2);
    this.shouldScrollToBottom = true;
  }
}

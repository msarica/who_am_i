import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, GameResponse } from '../../services/game.service';
interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  response?: GameResponse;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game.html',
  styleUrl: './game.css'
})
export class GameComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessagesContainer', { static: false }) chatMessagesContainer!: ElementRef;
  @ViewChild('questionInput', { static: false }) questionInput!: ElementRef;
  
  gameStarted: boolean = false;
  character: string = '';
  currentQuestion: string = '';
  lastQuestion: string = '';
  chatMessages: ChatMessage[] = [];
  isLoading: boolean = false;
  showWinModal: boolean = false;
  private shouldScrollToBottom: boolean = false;

  constructor(
    private gameService: GameService,
  ) {}

  ngOnInit(): void {
    this.gameService.gameWin$.subscribe((isWon) => {
      if(isWon) {
        console.log('Game won!');
        this.showWinModal = true;
      }
    });
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
      this.chatMessages = [];
      await this.gameService.startGame();
      this.gameStarted = true;
    } catch (error) {
      console.error('Failed to start game:', error);
      // You might want to show an error message to the user here
      alert('Failed to start game. Please make sure the AI model is loaded.');
    } finally {
      this.isLoading = false;
    }
  }

  async askQuestion(): Promise<void> {
    if (!this.currentQuestion.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      text: this.currentQuestion,
      isUser: true,
      timestamp: new Date()
    };

    this.chatMessages.push(userMessage);
    this.shouldScrollToBottom = true;
    
    const questionText = this.currentQuestion;
    this.lastQuestion = questionText; // Store the last question
    this.currentQuestion = '';
    this.isLoading = true;

    try {
      const response = await this.gameService.askQuestion(questionText);
      const botMessage: ChatMessage = {
        text: this.getResponseText(response),
        isUser: false,
        timestamp: new Date(),
        response: response
      };

      this.chatMessages.push(botMessage);
      this.shouldScrollToBottom = true;

    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: ChatMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      this.chatMessages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
      // Focus the input field after response is received
      setTimeout(() => {
        if (this.questionInput) {
          this.questionInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  async retryLastQuestion(): Promise<void> {
    if (!this.lastQuestion || this.isLoading) return;

    const userMessage: ChatMessage = {
      text: this.lastQuestion,
      isUser: true,
      timestamp: new Date()
    };

    this.chatMessages.push(userMessage);
    this.shouldScrollToBottom = true;
    this.isLoading = true;

    try {
      const response = await this.gameService.askQuestion(this.lastQuestion);
      const botMessage: ChatMessage = {
        text: this.getResponseText(response),
        isUser: false,
        timestamp: new Date(),
        response: response
      };

      this.chatMessages.push(botMessage);
      this.shouldScrollToBottom = true;

    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: ChatMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      this.chatMessages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
      // Focus the input field after response is received
      setTimeout(() => {
        if (this.questionInput) {
          this.questionInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  private getResponseText(response: GameResponse): string {
    switch (response.result) {
      case 'YES':
        return 'Yes!';
      case 'NO':
        return 'No!';
      case 'NOT_VALID':
        return 'That\'s not a valid yes/no question. Please ask a yes/no question.';
      default:
        return 'I don\'t understand. Please ask a yes/no question.';
    }
  }

  // resetGame(): void {
  //   this.gameService.startGame();
  //   this.gameStarted = false;
  //   this.chatMessages = [];
  //   this.lastQuestion = '';
  //   this.showWinModal = false;
  // }

  closeWinModal(): void {
    this.startGame();
  }

  isLastUserMessage(index: number): boolean {
    // Find the last user message index
    for (let i = this.chatMessages.length - 1; i >= 0; i--) {
      if (this.chatMessages[i].isUser) {
        return i === index;
      }
    }
    return false;
  }
}

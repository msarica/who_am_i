import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, GameResponse } from '../../services/game.service';
import { InferenceService } from '../../services/inference.service';

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
export class GameComponent implements OnInit {
  gameStarted: boolean = false;
  character: string = '';
  currentQuestion: string = '';
  chatMessages: ChatMessage[] = [];
  isLoading: boolean = false;

  constructor(
    private gameService: GameService,
  ) {}

  ngOnInit(): void {
  }

  async startGame(): Promise<void> {
    try {
      this.isLoading = true;
      await this.gameService.startGame();
      this.gameStarted = true;
      this.chatMessages = [];
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
    const questionText = this.currentQuestion;
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

      if (response.win) {
        // Game won logic could be added here
        console.log('Game won!');
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: ChatMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      this.chatMessages.push(errorMessage);
    } finally {
      this.isLoading = false;
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

  resetGame(): void {
    this.gameService.startGame();
    this.gameStarted = false;
    this.chatMessages = [];
  }
}

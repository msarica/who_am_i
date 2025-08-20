import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { InferenceService, InferenceResponse, InferenceStatus } from './inference.service';
import { ChatCompletion } from '@mlc-ai/web-llm';
import dedent from 'dedent';

export interface GameResponse {
  result: 'YES' | 'NO' | 'NOT_VALID' | 'GAME_WON';
  reasoning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameCount: number = 0;
  private character: string = '';
  private theme: string = 'disney';
  private gameStarted: boolean = false;
  private selectedCharacters: Set<string> = new Set();
  private selectableCharacters: Set<string> = new Set([
      "Mickey Mouse",
      "Minnie Mouse",
      "Donald Duck",
      "Daisy",
      "Goofy",
      "Pluto",
      "Chip",
      "Dale",
      "Snow White",
      "Cinderella",
      "Aurora",
      "Ariel",
      "Belle",
      "Jasmine",
      "Pocahontas",
      "Mulan",
      "Tiana",
      "Rapunzel",
      "Merida",
      "Elsa",
      "Anna",
      "Moana",
      "Simba",
      "Nala",
      "Mufasa",
      "Scar",
      "Timon",
      "Pumbaa",
      "Stitch",
      "Lilo",
      "Winnie the Pooh",
      "Tigger",
      "Piglet",
      "Eeyore",
      "Peter Pan",
      "Tinker Bell",
      "Captain Hook",
      "Aladdin",
      "Genie",
      "Hercules",
      "Megara",
      "Tarzan",
      "Jane Porter",
      "Kuzco",
      "Pacha",
      "Yzma",
      "Lightning McQueen",
      "Mater",
      "Woody",
      "Buzz Lightyear",
      "Jessie",
      "Bo Peep",
      "Mike Wazowski",
      "Sully",
      "Nemo",
      "Dory",
      "Marlin",
      "Remy",
      "Wall-E",
      "Eve",
      "Carl Fredricksen",
      "Russell",
  ]);

  public gameWin$ = new Subject<boolean>();

  constructor(private inferenceService: InferenceService) { }

  async startGame(): Promise<void> {
    // Wait for the inference service to be ready
    if (!this.inferenceService.isReady()) {
      throw new Error('Inference service is not ready. Please wait for the model to load.');
    }
    await this.selectCharacter();
    this.gameCount++;
  }

  private async selectCharacter(): Promise<void> {
    const selectableCharacters = Array.from(this.selectableCharacters).filter(c => !this.selectedCharacters.has(c));
    // const result = await this.inferenceService.makeInferenceCall({
    //   messages: [
    //     { role: 'system', content: dedent`You are a helpful assistant to a game called "Who Am I?".
    //     You are given a question and you must respond with the name of the main character and nothing else.
    //     You must respond with the name of one character and nothing else.
    //     Pick from the list below:
    //     ${selectableCharacters.join('\n')}
    //     ` },
    //     { role: 'user', content: dedent`Pick a character from the theme "${this.theme}".` }
    //   ],
    //   temperature: 0.7,
    //   max_tokens: 100,
    //   stream: false
    // });
    // // console.log(Array.from(this.selectedCharacters));
    // this.character = result.choices[0]?.message?.content || '';

    this.character = selectableCharacters[Math.floor(Math.random() * selectableCharacters.length)];

    this.selectedCharacters.add(this.character);
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

    const gameCount = this.gameCount;
    this.isGameWon(question);

    // Use the inference service to process the question with game-specific prompt
    const systemPrompt = dedent`You are playing a "Who Am I?" game. The character is "${this.character}" in the context of "${this.theme}". 
    The player asks a yes/no question about the character. 
    Use chain of thought approach, explain a short reasoning before answering. 
    After explaining the reasoning, respond with an answer in the following format:
    
    <REASONING> one-sentence reasoning </REASONING>
    <ANSWER> answer to the question YES|NO|NOT_VALID </ANSWER>
    `;
    
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

    if(gameCount !== this.gameCount) {
      return {
        result: 'GAME_WON',
        reasoning: 'Game won!'
      };
    }

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
    const answerMatch = content.match(/<ANSWER>\s*(YES|NO|NOT_VALID)\s*<\/ANSWER>/i);
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

    return {
      result
    };
  }

  private async isGameWon(question: string): Promise<void> {
    // const response = await this.inferenceService.makeInferenceCall({
    //   messages: [
    //     { role: 'system', content: dedent`You are a judge of a game called "Who Am I?".
    //     Use chain of thought approach, explain a short reasoning before answering. 
    //     You must respond with YES only if the user guessed "${this.character}" correctly and NO if user guessed something else.
    //     Use the following format:
    //     <REASONING> short reasoning </REASONING>
    //     <ANSWER> YES|NO </ANSWER>
    //     ` },
    //     { role: 'user', content: question
    //     }
    //   ],
    // });

    // const content = response.choices[0]?.message?.content || '';

    // console.log('isGameWon', content);
    // const contentLower = content.toLowerCase();

    // // Extract answer from XML-like tags if present
    // const answerMatch = content.match(/<ANSWER>\s*(YES|NO)\s*<\/ANSWER>/i);
    // let win = false;
    // if (answerMatch) {
    //   win = answerMatch[1] === 'YES';
    // } else {
    //   // Fallback to simple text parsing
    //   if (contentLower.includes('yes') && !contentLower.includes('no')) {
    //     win = true;
    //   } else if (contentLower.includes('no') && !contentLower.includes('yes')) {
    //     win = false;
    //   }
    // }

    const win = question.toLowerCase().includes(this.character.toLowerCase());
    if(!win) {
      return;
    }
    this.gameWin$.next(true);
  }

  resetGame(): void {
    this.gameStarted = false;
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

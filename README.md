# Who Am I Game

A web-based "Who Am I?" game powered by local AI inference using WebLLM.

## Features

- Interactive "Who Am I?" game where players ask yes/no questions to guess a character
- Local AI inference using WebLLM for intelligent responses
- Real-time question processing with reasoning
- WebGPU-powered local language model inference

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A WebGPU-compatible browser (Chrome 113+ or Edge 113+)
- WebGPU support enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:4200`

## Inference Service

The application uses WebLLM for local AI inference through the `InferenceService`. This service provides:

### Key Features

- **Local Inference**: All AI processing happens locally in the browser using WebGPU
- **Model Management**: Support for different language models
- **Game Integration**: Specialized methods for processing "Who Am I?" game questions
- **Error Handling**: Robust error handling and fallback mechanisms

### Usage

```typescript
import { InferenceService } from './services/inference.service';

// Initialize the service
const inferenceService = new InferenceService();
await inferenceService.initializeEngine();

// Make a general inference call
const response = await inferenceService.makeInference(
  "What is the capital of France?",
  "You are a helpful assistant."
);

// Process a game question
const gameResponse = await inferenceService.processGameQuestion(
  "Are you a video game character?",
  "Mario"
);
```

### Available Models

The service supports various language models including:
- `Llama-2-7b-chat-q4f16_1` (default)
- `Llama-2-13b-chat-q4f16_1`

### Browser Requirements

- **WebGPU Support**: Must have WebGPU enabled
- **Memory**: Sufficient RAM for model loading (typically 4GB+)
- **Storage**: Models are downloaded and cached locally

## Game Rules

1. The game selects a character (default: Mario)
2. Players ask yes/no questions to guess the character
3. The AI responds with YES, NO, or NOT_VALID
4. The game tracks whether questions help the player win
5. Players continue until they can guess the character

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Technologies Used

- **Angular**: Frontend framework
- **WebLLM**: Local AI inference engine
- **WebGPU**: GPU acceleration for model inference
- **RxJS**: Reactive programming for state management

## License

This project is licensed under the MIT License.

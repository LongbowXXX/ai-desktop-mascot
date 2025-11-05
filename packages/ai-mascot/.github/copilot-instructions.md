# AI Desktop Mascot - Development Guide

## Architecture Overview

This is an **Electron + React + Three.js** application that renders VRM avatars controlled by WebSocket commands from a `stage-director` backend service. The app creates a transparent, always-on-top window for desktop mascot characters.

### Key Components

- **Electron Main**: Transparent, frameless, always-on-top window with mouse event passthrough (`electron/main.ts`)
- **WebSocket Client**: Receives commands from `stage-director` service (`src/services/websocket_service.ts`)
- **VRM Rendering**: Three.js + `@pixiv/three-vrm` for 3D character rendering (`src/components/VRMAvatar.tsx`)
- **Command Processing**: Class-based validation using `class-validator` and `class-transformer` (`src/utils/command_validator.ts`)

### Data Flow

1. `stage-director` sends WebSocket commands → `StageDirectorWebSocketService`
2. Commands validated via `validateStageCommand()` using decorators
3. Handlers in `useStageCommandHandler` update avatar/stage state
4. React components re-render VRM avatars with new expressions/animations

## Command System

All commands follow a strict class-based structure with validation:

```typescript
// Commands are defined in src/types/command.ts
class SpeakCommand extends BaseCommand<'speak', SpeakPayload> {
  command: 'speak';
  payload: { characterId, message, caption, emotion, speakId };
}
```

**Available Commands**: `logMessage`, `speak`, `triggerAnimation`, `setPose`, `displayMarkdown`

When adding new commands:

1. Define payload class with decorators (`@IsString`, `@IsDefined`)
2. Create command class extending `BaseCommand`
3. Register in `commandRegistry` (`src/utils/command_validator.ts`)
4. Handle in `useStageCommandHandler` switch statement

## Critical Patterns

### TypeScript Configuration

- **Decorators enabled**: `experimentalDecorators: true` in `vite.config.ts` esbuild config
- Required for `class-validator`/`class-transformer` to work

### VRM Avatar Management

- Avatars configured in `public/avatars.json` (ids, VRM paths, animation mappings)
- Animations are `.vrma` files loaded via `@pixiv/three-vrm-animation`
- Facial expressions controlled via `useFacialExpression` hook

### Mouse Passthrough

- Window starts with `setIgnoreMouseEvents(true, { forward: true })`
- IPC handler `window:set-ignore-mouse-events` allows toggling hover interactions
- Critical for desktop mascot UX - window is transparent to clicks except on avatar

### TTS Integration

- VoiceVox API for Japanese TTS (`src/services/tts_service.ts`)
- Text split into sentences, played sequentially
- Speaker ID mapped per character (avatar1→3, avatar2→2)

## Environment Variables

Required in `.env` file:

- `VITE_STAGE_DIRECTER_ENDPOINT` - WebSocket URL for command server (e.g., `ws://localhost:8080`)
- `VITE_VOICEVOX_API_BASE` - VoiceVox TTS API endpoint
- `VITE_TTS_ENABLED` - Set `'false'` to disable TTS
- `VITE_DEBUG_SIDEBAR` - Set `'true'` to show debug sidebar

## Development Workflow

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server + Electron
npm run build        # Build for production (TypeScript + Vite + electron-builder)
npm run lint         # ESLint check
npm run format       # Prettier format
```

The dev server runs Vite with hot reload. Electron loads from `VITE_DEV_SERVER_URL` in dev mode.

## Common Gotchas

- **Material opacity**: VRM materials need special handling for fade-in effects. See `captureMaterialBaseState` in `VRMAvatar.tsx`
- **Animation transitions**: Use `ANIMATION_FADE_DURATION` constant for smooth blending between poses
- **WebSocket reconnection**: Service auto-reconnects with 5s delay. Check `reconnectDelayMs` parameter
- **Electron paths**: In production, use `process.env.DIST` and `process.env.VITE_PUBLIC` for asset resolution

## Testing

No formal test suite yet. Manual testing via:

1. Run `stage-director` backend
2. Start `npm run dev`
3. Send commands via WebSocket to trigger avatar behaviors

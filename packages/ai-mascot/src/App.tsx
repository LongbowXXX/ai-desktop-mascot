import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useStageCommandHandler } from './hooks/useStageCommandHandler';
import StagePage from './pages/StagePage';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const { avatars, setAvatars, stage, lastMessage, isConnected } = useStageCommandHandler();

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <StagePage
        avatars={avatars}
        setAvatars={setAvatars}
        stage={stage}
        lastMessage={lastMessage}
        isConnected={isConnected}
      />
    </ThemeProvider>
  );
}

export default App;

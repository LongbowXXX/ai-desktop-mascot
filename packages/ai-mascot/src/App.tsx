import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useStageCommandHandler } from './hooks/useStageCommandHandler';
import StagePage from './pages/StagePage';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: 'rgba(0, 0, 0, 0)',
      paper: 'rgba(0, 0, 0, 0)',
    },
    text: {
      primary: '#ffffff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'transparent',
          backgroundImage: 'none',
        },
      },
    },
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

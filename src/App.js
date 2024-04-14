import './App.css';
import WebFont from 'webfontloader';
import IndexView from './views/IndexView';

function App() {

  WebFont.load({
    google: {
      families: [
        "Pixelify Sans:regular,500,600,700",
        "Urbanist:100,200,300,regular,500,600,700,800,900,100italic,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic",
        "Source Code Pro:200,300,regular,500,600,700,800,900,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic",
        "Chakra Petch:200,300,regular,500,600,700,800,900,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic"
      ]
    }
  });

  return (
    <IndexView />
  )
}

export default App;

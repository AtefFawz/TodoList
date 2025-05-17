import "./App.css";

// Import Material UI
import Container from "@mui/material/Container";

// IMport Components
import Title from "./Main/Title";
import ToDoList from "./Main/ToDoList";

// Import UUID
import { v4 as uuid } from "uuid";

// Import Context
import { ContextTodo } from "./Main/Contexts/Context";

// Import Use State
import { useState } from "react";

// Import Themes
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { purple } from "@mui/material/colors";
// Variable Themes
const theme = createTheme({
  palette: {
    primary: {
      main: purple[500],
    },
  },
});
// Array Variable Context
const arrays = [
  {
    id: uuid(),
    heading: "مهامي",
    description: "",
    complete: false,
  },
];
// Parent Function
function App() {
  // Hook State
  const [data, setData] = useState(arrays);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" disableGutters>
        {/* COntText */}
        <ContextTodo.Provider value={{ data, setData }}>
          <div className="App">
            <Title />
            <ToDoList />
          </div>
        </ContextTodo.Provider>
        {/*End COntText */}
      </Container>
    </ThemeProvider>
  );
}

export default App;

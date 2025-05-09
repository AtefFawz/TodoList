import "./App.css";

// Import Material UI
import Container from "@mui/material/Container";

// IMport Components
import Title from "./Main/Title";
import Side from "./Main/Side";
import ToDoList from "./Main/ToDoList";

// Import Themes
// import { createTheme, ThemeProvider } from "@mui/material/styles";
// import { orange, purple } from "@mui/material/colors";

// Import UUID
import { v4 as uuid } from "uuid";

// Import Context
import { ContextTodo } from "./Main/Contexts/Context";

// Import Use State
import { useState } from "react";

// Variable Themes
// const theme = createTheme({
//   status: {
//     danger: orange[500],
//   },
//   palette: {
//     primary: {
//       main: purple[100],
//     },
//     second: {
//       sec: purple[500],
//     },
//   },
//   typography: [
//     {
//       fontFamily: "NOT",
//     },
//   ],
// });

// Array Variable Context
const arrays = [
  {
    id: uuid(),
    heading: "Atef",
    description: " i am a read a three books ",
    complete: false,
  },
  {
    id: uuid(),
    heading: "Fawzy",
    description: " i am a read a three books ",
    complete: false,
  },
  {
    id: uuid(),
    heading: "Khalaf",
    description: " i am a read a three books ",
    complete: false,
  },
];
// Parent Function
function App() {

  // Hook State
  const [data, setData] = useState(arrays);

  return (
    <Container maxWidth="sm">
      {/* <ThemeProvider theme={theme}> */}
        {/* COntText */}
        <ContextTodo.Provider value={{ data, setData }}>
          <div className="App" >
            <Title />
            <Side />
            <ToDoList  />
          </div>
        </ContextTodo.Provider>
        {/*End COntText */}
      {/* </ThemeProvider> */}
    </Container>
  );
}

export default App;

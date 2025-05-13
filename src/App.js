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
    <Container maxWidth="sm">
      {/* COntText */}
      <ContextTodo.Provider value={{ data, setData }}>
        <div className="App">
          <Title />
          <ToDoList />
        </div>
      </ContextTodo.Provider>
      {/*End COntText */}
    </Container>
  );
}

export default App;

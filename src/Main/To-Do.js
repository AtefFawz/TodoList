import DoneOutlineOutlinedIcon from "@mui/icons-material/DoneOutlineOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

// Import COntext
import { useContext } from "react";
import { ContextTodo } from "./Contexts/Context";
// Parent Function

export default function ToDo({ todo, heading }) {
  // Use Context
  const { data, setData } = useContext(ContextTodo);
  // ======= Start Function Handel Click

  function handelClick() {
    let Update = data.map(function (e) {
      if (e.id === todo.id) {
        // ========== Condition tow
        if (e.complete === true) {
          e.complete = false;
        } else {
          e.complete = true;
        }
        // End Condition tow
      }
      // End Condition One
      return e;
    });
    setData(Update);
  }
  // ======= End Function handel Click
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="toDo">
          <div className="content">
            <h4 style={{ maxWidth: "100%", wordBreak: "break-word" }}>
              {heading}
            </h4>
            <p style={{ maxWidth: "100%", wordBreak: "break-word" }}>
              {todo.description}
            </p>
          </div>
          <div className="icon">
            <div
              className="icon1"
              onClick={() => {
                handelClick();
              }}
              style={{
                backgroundColor: todo.complete
                  ? "rgba(18, 236, 18, 0.322)"
                  : "",
              }}
            >
              <DoneOutlineOutlinedIcon style={{ color: "green" }} />
            </div>
            {/* === */}
            <div className="icon2">
              <DeleteOutlineOutlinedIcon style={{ color: "red" }} />
            </div>
            <div className="icon3">
              <BorderColorOutlinedIcon style={{ color: "blue" }} />
            </div>
          </div>
        </div>
      </div>
      {/* Input Field */}
    </>
  );
}

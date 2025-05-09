import DoneOutlineOutlinedIcon from "@mui/icons-material/DoneOutlineOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
// Import Modal
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
// Import COntext
import { useContext } from "react";
import { ContextTodo } from "./Contexts/Context";
// Styled

// Parent Function

export default function ToDo({ todo, heading }) {
  // Hook Modal
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
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
  // Function delete
  function handelDelete(){
    const UpdateDelete = data.filter((e)=>{
      return e.id != todo.id;
    })
    setData(UpdateDelete)
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
                  ? "green"
                  : "white",
              }}
            >
              <DoneOutlineOutlinedIcon
                style={{
                  color: todo.complete ? "white" : "green",
                }}
              />
            </div>
            {/* === Modal*/}
            <div>
              <Dialog
                style={{ direction: "rtl" }}
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                  {"هل انت متأكد من رغبتك في حذف المهمه ؟"}
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                    لا يمكن التراجع عن الحذف في حالة اختيار زر:(الحذف)
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleClose}>تراجع</Button>
                  <Button
                    onClick={handelDelete}
                    autoFocus
                    style={{ color: "#8E1616" }}
                  >
                    حذف
                  </Button>
                </DialogActions>
              </Dialog>
            </div>
            {/* ============ */}
            <div className="icon2">
              <DeleteOutlineOutlinedIcon
                style={{ color: "red" }}
                onClick={handleClickOpen}
              />
            </div>
            {/* =======End Button Delete */}
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

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
// Update
import TextField from "@mui/material/TextField";
// Import COntext
import { useContext } from "react";
import { ContextTodo } from "./Contexts/Context";
// Import Card ============
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
// Import Gird
import Grid from "@mui/material/Grid";
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
    localStorage.setItem("data", JSON.stringify(Update));
  }
  // Function delete
  function handelDelete() {
    const UpdateDelete = data.filter((e) => {
      return e.id !== todo.id;
    });
    setData(UpdateDelete);
    localStorage.setItem("data", JSON.stringify(UpdateDelete));
  }
  // ======= End Function handel Click

  // Update Function
  const [openUpdate, setOpenUpdate] = useState(false);

  const handleClickOpenUpdate = () => {
    setOpenUpdate(true);
  };

  const handleCloseUpdate = () => {
    setOpenUpdate(false);
  };
  // =========
  const [update, setUpdate] = useState({
    heading: todo.heading,
    description: todo.description,
  });
  function handelclickupdate() {
    const Update = data.map((e) => {
      if (e.id === todo.id) {
        return {
          ...e,
          heading: update.heading,
          description: update.description,
        };
      } else {
        return e;
      }
    });
    setData(Update);
    localStorage.setItem("data", JSON.stringify(Update));
  }
  //End Update Function
  return (
    <>
      {/* Start Card */}
      <div>
        {/* Use Grid layOut */}
        <Grid container spacing={2} className="toDo">
          <Grid size={8}>
            <div
              style={{
                textDecoration: todo.complete ? "line-through" : "none",
                wordWrap: " break-word",
                overflowWrap: "break-word",
                height: "100%",
              }}
            >
              <span style={{ fontSize: "20px", padding: "10px 0 0 0" }}>
                {todo.heading}
              </span>
              <p
                style={{ wordWrap: " break-word", overflowWrap: "break-word" }}
              >
                {todo.description}
              </p>
            </div>
          </Grid>
          <Grid size={4}>
            <div
              className="icon"
              style={{
                height: "100%",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                gap: "2px",
              }}
            >
              {/*  */}
              <div
                className="icon1"
                onClick={() => {
                  handelClick();
                }}
                style={{
                  backgroundColor: todo.complete ? "green" : "white",
                }}
              >
                <DoneOutlineOutlinedIcon
                  style={{
                    color: todo.complete ? "white" : "green",
                  }}
                />
              </div>
              {/*  */}
              <div className="icon2">
                <DeleteOutlineOutlinedIcon
                  style={{ color: "red" }}
                  onClick={handleClickOpen}
                />
              </div>
              {/*  */}
              <div className="icon3">
                <BorderColorOutlinedIcon
                  style={{ color: "blue" }}
                  onClick={handleClickOpenUpdate}
                />
              </div>
              {/*  */}
            </div>
          </Grid>
        </Grid>
      </div>
      {/* End card  */}
      {/* === Modal*/}
      <div>
        <Dialog style={{ direction: "rtl" }} open={open} onClose={handleClose}>
          <DialogTitle>{"هل انت متأكد من رغبتك في حذف المهمة ؟"}</DialogTitle>
          <DialogContent>
            <DialogContentText>
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
      {/* Modal Edit Input */}
      <div>
        <Dialog
          maxWidth="xs"
          style={{ direction: "rtl", margin: "0px" }}
          open={openUpdate}
          onClose={handleCloseUpdate}
          fullWidth
        >
          <DialogTitle>{"تعديل المهمة"} </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="عنوان المهمة"
              fullWidth
              variant="standard"
              value={update.heading}
              onChange={(e) => {
                setUpdate({ ...update, heading: e.target.value });
              }}
            />
          </DialogContent>
          {/* ======== Input Tow  */}
          <DialogContent>
            <TextField
              autoFocus
              id="name"
              label="وصف المهمة"
              fullWidth
              variant="standard"
              value={update.description}
              onChange={(e) => {
                setUpdate({ ...update, description: e.target.value });
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseUpdate}>تراجع</Button>

            <Button
              autoFocus
              style={{ color: "#8E1616" }}
              onClick={handelclickupdate}
            >
              تاكيد
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </>
  );
}

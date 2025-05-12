import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import ToDo from "./To-Do";
import { v4 as uuid } from "uuid";

//  Import Context
import { useContext, useState, useEffect } from "react";
import { ContextTodo } from "./Contexts/Context";
//===============
export default function ToDoList() {
  // ========= Use Context
  const { data, setData } = useContext(ContextTodo);
  // Use State
  const [Inputs, setInput] = useState("");

  // ======== Function
  const Maps = data.map((e) => {
    return <ToDo key={uuid()} todo={e} heading={e.heading} />;
  });
  // =================
  // UseEffect
  useEffect(() => {
    const item = JSON.parse(localStorage.getItem("data"));
    if (item) {
      setData(item);
    }
  }, []);
  // =========
  function handelClick() {
    let newData = {
      id: uuid(),
      heading: Inputs,
      description: "",
      Complete: false,
    };
    const Upgrade = [...data, newData];
    setData(Upgrade);
    localStorage.setItem("data", JSON.stringify(Upgrade));
    setInput("");
  }

  // =======
  return (
    <div>
      {Maps}
      <Grid container spacing={1}>
        <Grid size={8}>
          <TextField
            color="sec"
            style={{ width: "95%", paddingRight: "5.5%" }}
            value={Inputs}
            onChange={(e) => {
              setInput(e.target.value);
            }}
          />
        </Grid>
        <Grid size={4}>
          <Button
            variant="contained"
            style={{ height: "100%", width: "90%", fontSize: "20px" }}
            onClick={() => {
              handelClick();
            }}
            disabled={Inputs === ""}
          >
            اضافة
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}

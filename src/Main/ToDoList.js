import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import ToDo from "./To-Do";
import { v4 as uuid } from "uuid";
// Import Button Group
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

//  Import Context
import { useContext, useState, useEffect } from "react";
import { ContextTodo } from "./Contexts/Context";
//===============
export default function ToDoList() {
  // ========= Use Context
  const { data, setData } = useContext(ContextTodo);
  // Use State
  const [Inputs, setInput] = useState("");
  // Button Action
  const [values, setValues] = useState("all");
  const handleChange = function (e) {
    setValues(e.target.value);
  };
  // logical Button
  const all = data.filter((e) => {
    return e.complete;
  });
  const notDone = data.filter((e) => {
    return !e.complete;
  });
  // ====== Conditional Rendering
  let editing = data;
  if (values === "done") {
    editing = all;
  } else if (values === "not-done") {
    editing = notDone;
  } else {
    editing = data;
  }
  // ======== Function
  const Maps = editing.map((e) => {
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
      <div className="btn">
        <ToggleButtonGroup
          color="primary"
          value={values}
          exclusive
          onChange={handleChange}
          aria-label="Platform"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <ToggleButton value="not-done">غير منجز</ToggleButton>
          <ToggleButton value="done">منجز</ToggleButton>
          <ToggleButton value="all">الكل</ToggleButton>
        </ToggleButtonGroup>
      </div>
      {Maps}
      <div style={{ margin: "10px 0 0 0" }}>
        <Grid container spacing={1}>
          <Grid size={8}>
            <TextField
              style={{ width: "100%" }}
              value={Inputs}
              onChange={(e) => {
                setInput(e.target.value);
              }}
            />
          </Grid>
          <Grid size={4}>
            <Button
              variant="contained"
              style={{
                height: "100%",
                width: "100%",
                fontSize: "20px",
              }}
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
    </div>
  );
}

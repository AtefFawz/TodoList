import Button from "@mui/material/Button";
import { useState } from "react";
export default function Side() {
  const [actives, setActive] = useState(null);
  let handleClick = (e) => {
    setActive(e);
  };
  console.log(actives);
  //============ return
  return (
    <>
      <div className="buttons">
        <Button
          onClick={() => {
            handleClick("btn1");
          }}
          className={actives === "btn1" ? "active" : ""}
          variant="outlined"
        >
          الكل
        </Button>
        {/* ====== */}
        <Button
          onClick={() => {
            handleClick("btn2");
          }}
          className={actives === "btn2" ? "active" : ""}
          variant="outlined"
        >
          منجز
        </Button>
        {/* ====== */}
        <Button
          onClick={() => {
            handleClick("btn3");
          }}
          className={actives === "btn3" ? "active" : ""}
          variant="outlined"
        >
          غير منجز
        </Button>
        {/* ====== */}
      </div>
    </>
  );
}

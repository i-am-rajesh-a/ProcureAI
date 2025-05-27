import React from "react";
import Chatbot from "./Chatbot";

export default function App() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        paddingTop: 40,
        backgroundColor: "#eef2f7",
        minHeight: "100vh",
      }}
    >
      <Chatbot />
    </div>
  );
}

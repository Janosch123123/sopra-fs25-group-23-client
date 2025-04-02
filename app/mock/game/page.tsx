import React from "react";
import styles from "@/styles/page.module.css"; // Import styles

const MainPage: React.FC = () => {
  const renderChessboard = () => {
    const cells = [];
    for (let i = 0; i < 144; i++) { // 12 columns * 12 rows = 144 cells
      cells.push(<div key={i} />);
    }
    return cells;
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.chessboardContainer}>
        {renderChessboard()}
      </div>
    </div>
  );
};

export default MainPage;

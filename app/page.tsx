"use client";

import { useRouter } from "next/navigation";
import { Button } from "antd";
import styles from "@/styles/page.module.css"; // Import styles

const Home: React.FC = () => {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push("/login");
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.mainContentContainer}>
        <div className={styles.logoContainer}>
          <div className={styles.logoImage}>
            {/* Logo will be displayed via CSS ::after pseudo-element */}
          </div>
        </div>
        <div className={styles.playButtonContainer}>
          <Button
              type="primary"
              variant="solid"
              className={styles["mainButton"]}
              onClick={() => router.push("/login")}
            >
              Login
          </Button>
          <Button
              type="primary"
              variant="solid"
              className={styles["mainButton"]}
              onClick={() => router.push("/register")}
            >
              Register
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;

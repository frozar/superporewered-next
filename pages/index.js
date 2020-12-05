// import Head from "next/head";
// import styles from "../styles/Home.module.css";
import Stretcher from "./main";
import GithubCorner from "react-github-corner";

export default function Home() {
  return (
    <>
      <GithubCorner
        href="https://github.com/frozar/superporewered-next"
        bannerColor="#30E89F"
      />
      <Stretcher />
    </>
  );
}

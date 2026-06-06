async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/db/fetch-all");
    const json = await res.json();
    console.log("Circle members data:", JSON.stringify(json.data?.circle_members, null, 2));
  } catch (err) {
    console.error("Error fetching:", err);
  }
}
run();

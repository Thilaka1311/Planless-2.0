async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/db/fetch-all");
    const json = await res.json();
    console.log("Configured:", json.configured);
    console.log("Tables Missing:", json.tables_missing);
    console.log("Circles length:", json.data?.circles?.length);
    console.log("Circles data:", JSON.stringify(json.data?.circles, null, 2));
    console.log("Circle members length:", json.data?.circle_members?.length);
  } catch (err) {
    console.error("Error fetching:", err);
  }
}
run();

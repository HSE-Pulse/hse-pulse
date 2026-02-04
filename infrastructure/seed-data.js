// MongoDB seed script for PulseFlow demo data
db = db.getSiblingDB("healthcare");

// Seed hospitals
db.hospitals.drop();
db.hospitals.insertMany([
  { hospital_code: "CUH", trolley_code: "CU", name: "Cork University Hospital", region: "South", hse_area: "HSE South" },
  { hospital_code: "MUH", trolley_code: "MMU", name: "Mater Misericordiae University Hospital", region: "Dublin North", hse_area: "HSE Dublin North East" },
  { hospital_code: "TUH", trolley_code: "TU", name: "Tallaght University Hospital", region: "Dublin South West", hse_area: "HSE Dublin Mid-Leinster" }
]);
print("Hospitals inserted: " + db.hospitals.countDocuments());

// Generate trolley data for the last 90 days
db.trolley_counts.drop();
var hospitals = ["CU", "MMU", "TU"];
var today = new Date();
var records = [];

for (var d = 90; d >= 0; d--) {
  var date = new Date(today);
  date.setDate(date.getDate() - d);
  var dateStr = date.toISOString().substring(0, 10);

  hospitals.forEach(function(code) {
    // Generate realistic trolley counts with weekly patterns
    var dayOfWeek = date.getDay();
    var baseCount = code === "MMU" ? 45 : (code === "CU" ? 35 : 30);
    // Higher on weekends
    var weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 10 : 0;
    // Random variation
    var variation = Math.floor(Math.random() * 20) - 10;
    var trolleyCount = Math.max(5, baseCount + weekendBoost + variation);

    records.push({
      hospital_code: code,
      date: dateStr,
      trolley_count: trolleyCount,
      admissions: Math.floor(trolleyCount * 0.8 + Math.random() * 10),
      discharges: Math.floor(trolleyCount * 0.7 + Math.random() * 10),
      trolleys_gt_24hrs: Math.floor(trolleyCount * 0.3 + Math.random() * 5),
      elderly_waiting: Math.floor(trolleyCount * 0.4 + Math.random() * 5)
    });
  });
}

db.trolley_counts.insertMany(records);
print("Trolley records inserted: " + db.trolley_counts.countDocuments());

// Show latest date
var latest = db.trolley_counts.findOne({}, {date: 1}, {sort: {date: -1}});
print("Latest date: " + latest.date);

import 'package:intl/intl.dart';

String convertTo24HourFormat(String timeIn12HourFormat) {
  // Parse the 12-hour time format
  DateTime dateTime = DateFormat("hh:mm a").parse(timeIn12HourFormat);

  // Format to 24-hour format
  String timeIn24HourFormat = DateFormat("HH:mm").format(dateTime);

  return timeIn24HourFormat;
}

void main() {
  String time12Hour = "02:33 AM";
  String time24Hour = convertTo24HourFormat(time12Hour);
  print(time24Hour); // Output: 02:33

  String time12HourPM = "02:33 PM";
  String time24HourPM = convertTo24HourFormat(time12HourPM);
  print(time24HourPM); // Output: 14:33
}
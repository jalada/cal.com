import { EventTypeAttendeeReminder } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import twilio from "twilio";

import prisma from "@lib/prisma";

dayjs.extend(isBetween);

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID;

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

export const scheduleSMSAttendeeReminders = async (
  uid: string,
  reminderPhone: string,
  startTime: string,
  attendeeReminder: EventTypeAttendeeReminder
) => {
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const scheduledDate = dayjs(startTime).subtract(attendeeReminder.time, attendeeReminder.unitTime);
  console.log("🚀 ~ file: reminderManager.tsx ~ line 25 ~ scheduledDate", scheduledDate);
  console.log("🚀 ~ file: reminderManager.tsx ~ line 25 ~ currentDate", currentDate);
  console.log("🚀 ~ file: reminderManager.tsx ~ line 25 ~ date7days", currentDate.add(7, "day"));
  console.log(
    "🚀 ~ file: reminderManager.tsx ~ line 25 ~ date7days",
    scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))
  );

  // Check the scheduled date and right now
  // Can only schedule at least 60 minutes in advance so send a reminder
  if (currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject)) {
    try {
      const response = await client.messages.create({
        body: "This is a test",
        messagingServiceSid: TWILIO_MESSAGING_SID,
        to: reminderPhone,
      });

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "SMS",
          referenceId: response.sid,
          scheduledDate: dayjs().toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error sending SMS with error ${error}`);
    }
  }
  // Can only schedule text messages 7 days in advance
  if (scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))) {
    try {
      const response = await client.messages.create({
        body: "This is a test",
        messagingServiceSid: TWILIO_MESSAGING_SID,
        to: reminderPhone,
        scheduleType: "fixed",
        sendAt: scheduledDate.toDate(),
      });
      console.log("🚀 ~ file: reminderManager.tsx ~ line 58 ~ response", response);

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "SMS",
          referenceId: response.sid,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error scheduling SMS with error ${error}`);
    }
  }

  if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
    // Write to DB and send to CRON if scheduled reminder date is past 7 days
    await prisma.attendeeReminder.create({
      data: {
        booking: {
          connect: {
            uid: uid,
          },
        },
        method: "SMS",
        referenceId: "",
        scheduledDate: scheduledDate.toDate(),
        scheduled: false,
      },
    });
  }
};

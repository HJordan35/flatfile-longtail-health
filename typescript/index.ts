/**
 * This code is used in Flatfile's Custom App Tutorial
 * https://flatfile.com/docs/apps/custom
 *
 * To see all of Flatfile's code examples go to: https://github.com/FlatFilers/flatfile-docs-kitchen-sink
 */

import type { FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import type { FlatfileRecord } from "@flatfile/plugin-record-hook";

import api from "@flatfile/api";
import { recordHook, bulkRecordHook } from "@flatfile/plugin-record-hook";

export default function (listener: FlatfileListener) {

  // Part 1: Setup a listener (https://flatfile.com/docs/apps/custom/meet-the-listener)
  listener.on("**", (event: FlatfileEvent) => {
    // This is a catch all for all events. Might be a good idea to have this running initially so you can see what events are being emitted
    // as you interact with Flatfile
    console.log(`Received event: ${event.topic}`);
  });


  /**
   * This is an example of how you can CREATE / CONFIGURE your space VIA A LISTENER if you want to...
   * 
   * Right now, you are simply passing a config into the `initializeFlatfile()` call in the UI. However, sometimes there are reasons for doing things 
   * server side instead...Some of the main reasons might include:
   * 
   * - Maybe you want to dynamically create your config based on some external, async data source
   * - You want to assign a DEFAULT page assignments - this is done via ID, so the IDs must be created before it can be set
   * - etc
   * 
   * Ultimately, passing in a static config is the easiest way to get setup. But the listener avenue is always an option if you need more complex logic - Ill keep it here  
   * for reference, but you will not need it if you continue to provide the initial workbook config via the `initializeFlatfile()` call in the UI
   */
  // listener.filter({ job: "space:configure" }).on("job:ready", async (event: FlatfileEvent) => {
  //   const { spaceId, environmentId, jobId } = event.context;
  //   try {
  //     await api.jobs.ack(jobId, {
  //       info: "Gettin started.",
  //       progress: 10,
  //     });

  //     await api.workbooks.create({
  //       spaceId,
  //       environmentId,
  //       name: "All Data",
  //       labels: ["pinned"],
  //       sheets: [
  //         {
  //           name: "Contacts",
  //           slug: "contacts",
  //           fields: [
  //             {
  //               key: "firstName",
  //               type: "string",
  //               label: "First Name",
  //             },
  //             {
  //               key: "lastName",
  //               type: "string",
  //               label: "Last Name",
  //             },
  //             {
  //               key: "email",
  //               type: "string",
  //               label: "Email",
  //             },
  //           ],
  //         },
  //       ],
  //       actions: [
  //         {
  //           operation: "submitAction",
  //           mode: "foreground",
  //           label: "Submit foreground",
  //           description: "Submit data to webhook.site",
  //           primary: true,
  //         },
  //       ],
  //     });

  //     const doc = await api.documents.create(spaceId, {
  //       title: "Getting Started",
  //       body:
  //         "# Welcome\n" +
  //         "### Say hello to your first customer Space in the new Flatfile!\n" +
  //         "Let's begin by first getting acquainted with what you're seeing in your Space initially.\n" +
  //         "---\n",
  //     });

  //     await api.spaces.update(spaceId, {
  //       environmentId,
  //       metadata: {
  //         theme: {
  //           root: {
  //             primaryColor: "red",
  //           },
  //           sidebar: {
  //             backgroundColor: "red",
  //             textColor: "white",
  //             activeTextColor: "midnightblue",
  //           },
  //           // See reference for all possible variables
  //         },
  //       },
  //     });

  //     await api.jobs.complete(jobId, {
  //       outcome: {
  //         message: "Your Space was created. Let's get started.",
  //         acknowledge: true,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Error:", error.stack);

  //     await api.jobs.fail(jobId, {
  //       outcome: {
  //         message: "Creating a Space encountered an error. See Event Logs.",
  //         acknowledge: true,
  //       },
  //     });
  //   }
  // });

  /****************** EXISTING Job Handlers ******************/
  /**
   * The UI also has a series of jobs it will run for certain async operations (like mapping) - You can also listen for events for that particular job, and then perform logic based on its outcome
   * 
   * The example where this could be valuable is for checking the HEADERS of the mapped file when mapping is complete - and showing a custom message to the user\
   * 
   * What we do, is we can listen for a completion of the "workbook:map" job, and then spawn our OWN job using that jobId as CONTEXT, so that we can perform our own syncrhonous logic
   */
  listener.on("job:completed", { job: "workbook:map" }, async (event: FlatfileEvent) => {
    try {
      // You can add these acknowledgements to acknowledge the work is happening - it also sets the progress bar state in the UI
      await api.jobs.ack(event.context.jobId, {
        info: "Gettin started.",
        progress: 10,
      })
      const jobResponse = await api.jobs.get(event.context.jobId)
      const job = jobResponse.data
      const sheetId = (job.config as any).sourceSheetId

      // Creates a NEW job called "validate-headers" which can then be handled below
      await api.jobs.create({
        operation: "validate-headers",
        input: {
          jobId: event.context.jobId,
        },
        type: "sheet",
        trigger: "immediate",
        source: sheetId,
        managed: true,
        subject: {
          type: "collection",
          query: {},
          params: {
            sheetId,
          },
          resource: "records",
        },
      })
    } catch (error) {
      console.log("ERROR", error)
      await api.jobs.fail(event.context.jobId, {
        outcome: {
          message: "This Job failed.",
        },
      })
    }
  })

  // Handler for the "sheet:validate-headers" job that is spawned above via the completion of any mapping job
  listener.on("job:ready", { job: "sheet:validate-headers" }, async (event: FlatfileEvent) => {
    try {
      await api.jobs.ack(event.context.jobId, {
        info: "Gettin started.",
        progress: 10,
      })
      // Get data for the current job
      const jobResponse = await api.jobs.get(event.context.jobId)
      const job = jobResponse.data
      const mappingJobId = job.input.jobId

      // Take the context passed in and use it to get data from the original mapping job
      const mappingJobResponse = await api.jobs.get(mappingJobId)
      const mappingJob = mappingJobResponse.data
      const sheetOfUploadedFile = (mappingJob.config as any).sourceSheetId
      const sheetOfExpectedSchema = (mappingJob.config as any).destinationSheetId
      const isValid = false

      // You now have the schemas/configs for both the originally uploaded file, and the schema that you need customers to match...
      const { data: configForUploadedFile } = await api.sheets.get({ spaceId: event.context.spaceId, workbookId: event.context.workbookId, sheetId: sheetOfUploadedFile })
      const { data: configForExpectedSchema } = await api.sheets.get({ spaceId: event.context.spaceId, workbookId: event.context.workbookId, sheetId: sheetOfExpectedSchema })

      // perform logic to compare the 2 sheet schemas to find discrepancies between things like field names, types, etc


      // Based on above, you can then show messages/outcomes to the user based on the validity of the uploaded/mapped sheet
      if (isValid) {
        await api.jobs.complete(event.context.jobId, {
          outcome: {
            message: "Workbook Updated",
          },
        })
      } else {
        await api.jobs.fail(event.context.jobId, {
          outcome: {
            message: "This workbook is not valid. Please check your data.",
          },
        })
      }
    } catch (error) {
      console.log("ERROR", error)
      await api.jobs.fail(event.context.jobId, {
        outcome: {
          message: "This Job failed.",
        },
      })
    }
  })

  /****************** CUSTOM Job Handlers ******************/
  /**
   * Within your Workbook, you can define ACTIONS - These appear as clickable buttons/options on either the WORKBOOK level, or SHEET level depending on where you define them.
   * 
   * EXAMPLE:
   *  {
   *    ...other_workbook_config,
   *    "actions": [
   *      {
   *        "operation": "validate-accuracy",
   *        "mode": "foreground",
   *        "label": "Validate Accuracy",
   *        "description": "Validate the accuracy of the data",
   *        "primary": true
   *      }
   *    ]
   *  }
   * 
   * Upon INVOKING that action, a JOB will then be created. Jobs are containers for trackable, async operations. Using a listener, you can respond to the creation of a job, and 
   * perform any logic you want within that context.
   * 
   */

  /**
   * An example that we talked about, could be large, check for sheet validity. While you could possibly do this in recordHook - sometimes it is best for full-sheet validations to be done in a Job
   */
  listener.on("job:ready", { job: "workbook:validate-accuracy" }, async ({ context, payload }) => {
    const { jobId } = context

    try {
      await api.jobs.ack(jobId, {
        info: "Gettin started.",
        progress: 10,
      })

      const { data: workbook } = await api.workbooks.get({ spaceId: context.spaceId, workbookId: context.workbookId })
      let isValid = false


      // Perform logic here to get records, sheets, etc and check for validity / accuracy


      if (isValid) {
        await api.jobs.complete(jobId, {
          outcome: {
            message: "Workbook Updated",
          },
        })
      } else {
        await api.jobs.fail(jobId, {
          outcome: {
            message: "This workbook is not valid. Please check your data.",
          },
        })
      }
    } catch (error) {
      console.log("ERROR", error)
      await api.jobs.fail(jobId, {
        outcome: {
          message: "This Job failed.",
        },
      })
    }
  })

  /****************** Record Hooks ******************/

  /**
   * This is an example of a recordHook. Record hooks are a type of listener that can be used to perform custom logic on records that are added/updated to a specific 
   * 
   * This is good for simple, one-off transformations that run on a record-by-record basis.
   */
  listener.use(
    recordHook("<slug_of_sheet_where_hook_will_run>", async (record: FlatfileRecord) => {
      let last = record.get("lastName") as string

      if (last !== null) {
        const newLast = last.toUpperCase()
        record.set("lastName", newLast)
      } else {
        record.addError("lastName", "Must have a last name")
      }

      return record
    })
  )

  /**
 * This is an example of a bulkRecordHook. It is similar to the recordHook, but it is designed to process multiple records at once.
 * 
 * This is good for more complex transformations that need to process multiple records at once.
 */
  listener.use(
    bulkRecordHook("<slug_of_sheet_where_hook_will_run>", (records) => {
      // Process records here
      return records.map(record => {
        // Modify each record
        return record;
      });
    })
  );



}

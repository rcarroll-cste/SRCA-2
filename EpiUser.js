var stateId;
var categoryList = [];
var timeframe1List = [];
var timeframe2List = [];
var timeframe3List = [];
var timeframe4List = [];
var reportType1List = [];
var reportType2List = [];
var reportType3List = [];
var reportType4List = [];
var statesList = [];
var myStateData;

var currentUserInfoUrl = "/wp/v2/users/me?_fields=id,name,role,acf";
var categoriesUrl = "/wp/v2/condition-category?per_page=100&_fields=id,name";
var timeFrame1Url = "/wp/v2/timeframe-1?_fields=id,name&per_page=100";
var timeFrame2Url = "/wp/v2/timeframe-2?_fields=id,name&per_page=100";
var timeFrame3Url = "/wp/v2/timeframe-3?_fields=id,name&per_page=100";
var timeFrame4Url = "/wp/v2/timeframe-4?_fields=id,name&per_page=100";
var reportType1Url = "/wp/v2/report-type-1?_fields=id,name";
var reportType2Url = "/wp/v2/report-type-2?_fields=id,name";
var reportType3Url = "/wp/v2/report-type-3?_fields=id,name";
var reportType4Url = "/wp/v2/report-type-4?_fields=id,name";
var allStatesUrl = "/wp/v2/state?per_page=100&_fields=id,title";
var myStateUrl = "/wp/v2/state/";
var conditionsUrlWithStateFilter = "/wp/v2/condition?condition_state=";
var conditionsUrl = "/wp/v2/condition";

const DEFAULT_TIMEFRAMES = {
  main_timeframe_1: 177, // Replace with your desired default value
  main_timeframe_2: 490, // Replace with your desired default value
  main_timeframe_3: 491, // Replace with your desired default value
  main_timeframe_4: 500, // Replace with your desired default value
};

$(document).ready(function () {
  console.log("Initializing dropdowns and TreeList...");

  // Set up AJAX defaults for jQuery
  $.ajaxSetup({
    beforeSend: function (xhr) {
      xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
    },
  });

  // Fetch the current user info
  wp.apiRequest({
    path: "/wp/v2/users/me?_fields=id,name,role,acf",
  })
    .done(function (data) {
      stateId = data.acf.state_1.ID;
      console.log("User's state ID:", stateId);

      // Proceed with initialization
      initializeApp(data);
    })
    .fail(function (error) {
      console.error("Error fetching user information:", error);
    });
});

function initializeApp(userData) {
  Promise.all([
    getJSONfromUrl("/wp/v2/condition-category?per_page=100&_fields=id,name"),
    getJSONfromUrl("/wp/v2/timeframe-1?_fields=id,name&per_page=100"),
    getJSONfromUrl("/wp/v2/timeframe-2?_fields=id,name&per_page=100"),
    getJSONfromUrl("/wp/v2/timeframe-3?_fields=id,name&per_page=100"),
    getJSONfromUrl("/wp/v2/timeframe-4?_fields=id,name&per_page=100"),
    getJSONfromUrl("/wp/v2/report-type-1?_fields=id,name"),
    getJSONfromUrl("/wp/v2/report-type-2?_fields=id,name"),
    getJSONfromUrl("/wp/v2/report-type-3?_fields=id,name"),
    getJSONfromUrl("/wp/v2/report-type-4?_fields=id,name"),
    getJSONfromUrl("/wp/v2/state?per_page=100&_fields=id,title"),
    getJSONfromUrl("/wp/v2/state/" + stateId),
  ])
    .then(
      ([
        categories,
        timeframe1,
        timeframe2,
        timeframe3,
        timeframe4,
        reportType1,
        reportType2,
        reportType3,
        reportType4,
        states,
        myState,
      ]) => {
        categoryList = categories;
        timeframe1List = timeframe1;
        timeframe2List = timeframe2;
        timeframe3List = timeframe3;
        timeframe4List = timeframe4;
        reportType1List = reportType1;
        reportType2List = reportType2;
        reportType3List = reportType3;
        reportType4List = reportType4;
        statesList = states;
        myStateData = myState;

        console.log("All data fetched successfully");

        updateStateTitle(myState.title.rendered);
        startTreelist();
        createCategoryDropdown();
        createApproveJurisdictionButton();
      }
    )
    .catch((error) => {
      console.error("Error fetching one or more resources:", error);
    });

  // Check the user's role
  if (userData.role === "administrator") {
    console.log("User is an administrator.");
  } else {
    console.log("User is not an administrator. User role is: " + userData.role);
  }
}

function updateStateTitle(stateName) {
  $("#state-title .et_pb_text_inner h2 strong").text(stateName + " Users").css("color", "#3831bc");
}

function createCategoryDropdown() {
  $("#category-dropdown").kendoDropDownList({
    dataTextField: "name",
    dataValueField: "id",
    dataSource: {
      transport: {
        read: function (options) {
          wp.apiRequest({
            path: "/wp/v2/condition-category?per_page=100&_fields=id,name",
          })
            .done(function (data) {
              options.success(data);
            })
            .fail(function (error) {
              options.error(error);
            });
        },
      },
      schema: {
        data: function (response) {
          console.log("categories fetched:", response);
          // Sort categories alphabetically by name
          response.sort(function (a, b) {
            return a.name.localeCompare(b.name); // Ensure sorting is case-insensitive and locale-aware
          });

          // Prepend the 'ALL' option to the sorted array
          response.unshift({id: "1", name: "ALL"});

          return response;
        },
      },
    },
    change: function (e) {
      var selectedCategory = this.value();
      filterTreeListByCategory(selectedCategory);
    },
  });
}

function filterTreeListByCategory(categoryId) {
  var treeList = $("#treelist").data("kendoTreeList");
  if (treeList) {
    if (categoryId === "1") {
      // "ALL" option selected, clear the filter
      treeList.dataSource.filter({});
    } else {
      treeList.dataSource.filter({
        field: "acf.main_condition_category",
        operator: "eq",
        value: parseInt(categoryId),
      });
    }
  }
}

function createStateDropdown() {
  $("#state-dropdown").kendoDropDownList({
    dataTextField: "title.rendered", // Updated to point to the nested title object
    dataValueField: "id",
    dataSource: {
      transport: {
        read: {
          url: allStatesUrl, // Use the allStatesUrl that's already set up to return the data
          dataType: "json",
          beforeSend: function (xhr) {
            console.log(
              "Setting X-WP-Nonce header for user information request"
            );
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
        },
      },
      schema: {
        data: function (response) {
          console.log("States fetched:", response);
          // Sort states alphabetically by their rendered title
          return response.sort((a, b) =>
            a.title.rendered.localeCompare(b.title.rendered)
          );
        },
      },
    },
    optionLabel: "ALL", // This will add an "ALL" option at the top of the dropdown
  });
}

function createApproveJurisdictionButton() {
  if (!myStateData) {
    console.error("State data not available");
    return;
  }

  var dateOfLastApproval = myStateData.acf.date_of_last_approval;
  var isButtonActive = !isDateInCurrentYear(dateOfLastApproval);

  $("#jurisdiction-approval").kendoButton({
    enable: isButtonActive,
    click: function (e) {
        kendo.confirm(
            "Warning, this submission box is intended for designated state epidemiologists ONLY.<br><br>" +
            "Please only confirm submission if your jurisdiction's SRCA data has been reviewed and/or updated in its entirety for the given year."
        ).then(function() {
            console.log("Approve Jurisdiction button clicked");
            approveJurisdiction();
        });
    },
});


  // Update the button text based on its state
  updateButtonText(isButtonActive);
}

function isDateInCurrentYear(dateString) {
  if (!dateString) return false;

  var date = new Date(dateString);
  var currentYear = new Date().getFullYear();
  return date.getFullYear() === currentYear;
}

function updateButtonText(isActive) {
  var button = $("#jurisdiction-approval").data("kendoButton");
  if (button) {
    button.element.text(
      isActive ? "Approve Jurisdiction" : "Already Approved This Year"
    );
  }
}

function approveJurisdiction() {
  var currentDate = new Date();
  var formattedDate = kendo.toString(currentDate, "yyyy-MM-dd");

  // Update the myStateData object
  myStateData.acf.date_of_last_approval = formattedDate;

  // Send the update to the server
  wp.apiRequest({
    path: "/wp/v2/state/" + stateId,
    method: "POST",
    data: {
      acf: {
        date_of_last_approval: formattedDate,
      },
    },
  })
    .done(function (response) {
      console.log("Jurisdiction approval date updated successfully");
      // Refresh the button state
      createApproveJurisdictionButton();
    })
    .fail(function (error) {
      console.error("Error updating jurisdiction approval date:", error);
    });
}

function startTreelist() {
  var treelistDataSource = new kendo.data.TreeListDataSource({
    transport: {
      read: function (options) {
        wp.apiRequest({
          path:
            "/wp/v2/condition?condition_state=" + stateId + "&per_page=5000",
        })
          .done(function (data) {
            console.log("Raw data from API:", data);
            options.success(data);
          })
          .fail(function (error) {
            console.error("Error fetching data:", error);
            options.error(error);
          });
      },
      update: function (options) {
        console.log("Updating condition:", JSON.stringify(options, null, 2));

        if (
          !options.data ||
          !options.data.models ||
          !Array.isArray(options.data.models) ||
          options.data.models.length === 0
        ) {
          console.error("Error: Invalid data structure for update");
          options.error("Invalid data structure for update");
          return;
        }

        let model = options.data.models[0];
        console.log("Model to update:", JSON.stringify(model, null, 2));

        if (!model.id) {
          console.error("Error: Condition ID is missing or invalid", model);
          options.error("Condition ID is missing or invalid");
          return;
        }

        var conditionId = model.id;

        // Prepare the data to be sent
        var updateData = {
          title: model.title,
          acf: model.acf,
          "condition-category": model["condition-category"],
        };

        console.log(
          "Data to be sent for update:",
          JSON.stringify(updateData, null, 2)
        );

        wp.apiRequest({
          path: "/wp/v2/condition/" + conditionId,
          method: "POST",
          data: updateData,
        })
          .done(function (response) {
            console.log("Update successful:", response);
            options.success(response);
          })
          .fail(function (error) {
            console.error("Error updating condition:", error);
            options.error(error);
          });
      },
      create: function (options) {
        console.log(
          "Create function called with options:",
          JSON.stringify(options, null, 2)
        );

        if (
          !options.data ||
          !options.data.models ||
          !Array.isArray(options.data.models) ||
          options.data.models.length === 0
        ) {
          console.error("Error: Invalid data structure for create");
          options.error("Invalid data structure for create");
          return;
        }

        let newCondition = options.data.models[0];
        console.log(
          "New condition data:",
          JSON.stringify(newCondition, null, 2)
        );

        // Prepare the data to be sent
        var createData = {
          title: newCondition.title,
          acf: {
            ...DEFAULT_TIMEFRAMES, // Start with default values
            ...newCondition.acf, // Override with any user-selected values
            condition_state: stateId, // Add the state ID
          },
          parent: newCondition.parent_Id,
          status: "publish",
        };

        console.log(
          "Data to be sent for create:",
          JSON.stringify(createData, null, 2)
        );

        wp.apiRequest({
          path: "/wp/v2/condition",
          method: "POST",
          data: createData,
        })
          .done(function (response) {
            console.log(
              "Create successful. Server response:",
              JSON.stringify(response, null, 2)
            );
            options.success(response);

            // Refresh the TreeList to show the new item
            var treeList = $("#treelist").data("kendoTreeList");
            if (treeList) {
              console.log("Refreshing TreeList after successful create");
              treeList.dataSource.read();
            } else {
              console.error("TreeList not found for refresh after create");
            }
          })
          .fail(function (error) {
            console.error(
              "Error creating condition. Server response:",
              JSON.stringify(error, null, 2)
            );
            console.error("Error details:", error.responseText);
            options.error(error);
            alert(
              "Failed to create new condition. Please check the console for more details."
            );
          });
      },
    },
    batch: true,
    sort: [{field: "title", dir: "asc"}],
    schema: {
      model: {
        id: "id",
        parentId: "parent_Id",
        fields: {
          id: {
            type: "number",
            nullable: false,
            field: "id",
            editable: false,
          },
          parent_Id: {nullable: false, field: "parent_Id", type: "number"},
          title: {
            type: "string",
            validation: {required: true},
          },
          acf: {
            main_condition_category: {
              type: "number",
              defaultValue: 0,
              validation: {required: true},
            },
            main_timeframe_1: {
              type: "number",
              defaultValue: 177,
              validation: {required: false},
            },
            main_timeframe_2: {
              type: "number",
              defaultValue: 490,
              validation: {required: false},
            },
            main_timeframe_3: {
              type: "number",
              defaultValue: 491,
              validation: {required: false},
            },
            main_timeframe_4: {
              type: "number",
              defaultValue: 500,
              validation: {required: false},
            },
            condition_state: {type: "number", defaultValue: stateId},
            /*srca_approved: {
              type: "boolean",
              defaultValue: false,
            },*/
            year_made_reportable: {
              type: "date",
              defaultValue: new Date("7/1/2019"),
              parse: function (value) {
                return value ? new Date(value) : null;
              },
            },
            nnc: {type: "boolean", defaultValue: false},
            reportable_state: {
              type: "boolean",
              defaultValue: true,
            },
          },
        },
        expanded: true,
      },
      init: function (data) {
        console.log("Initializing data item:", data);
        // Ensure all expected methods are available
        if (typeof this.get !== "function") {
          console.warn("get method not found on data item");
        }
      },
      parse: function (response) {
        if (Array.isArray(response)) {
          return response.map(this.parseItem);
        }
        return this.parseItem(response);
      },
      parseItem: function (item) {
        if (item.acf) {
          item.acf.year_made_reportable = item.acf.year_made_reportable
            ? new Date(item.acf.year_made_reportable)
            : null;
        }
        return item;
      },
    },
  });

  $("#treelist").kendoTreeList({
    dataSource: treelistDataSource,
    toolbar: ["create", "search"],
    search: {
      fields: ["title"],
    },
    editable: true,
    height: "2000px",
    columns: [
      {
        field: "title",
        expandable: true,
        title: "Name",
        width: 300,
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.main_condition_category",
        title: "Category",
        editor: conditionCategoryDropdown,
        template: function (dataItem) {
          var categoryId =
            dataItem.acf && dataItem.acf["main_condition_category"];
          if (!categoryId) {
            return "N/A";
          }
          var category = categoryList.find(function (cat) {
            return cat.id === categoryId;
          });
          return category ? category.name : "Unknown";
        },
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.main_timeframe_1",
        title: "Timeframe 1",
        editor: timeframe1Dropdown,
        template: timeframeTemplate("main_timeframe_1"),
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.main_timeframe_2",
        title: "Timeframe 2",
        editor: timeframe2Dropdown,
        template: timeframeTemplate("main_timeframe_2"),
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.main_timeframe_3",
        title: "Timeframe 3",
        editor: timeframe3Dropdown,
        template: timeframeTemplate("main_timeframe_3"),
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.main_timeframe_4",
        title: "Timeframe 4",
        editor: timeframe4Dropdown,
        template: timeframeTemplate("main_timeframe_4"),
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.reportable_state",
        title: "Reportable (State)",
        editable: function (dataItem) {
          return false;
        },
        template: function (dataItem) {
          return dataItem["acf"]["reportable_state"] ? "<b>Yes</b>" : "No";
        },
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.nnc",
        title: "NNC",
        width: 100,
        editor: nncDropdownEditor,
        template: function (dataItem) {
          return dataItem["acf"]["nnc"] ? "<b>Yes</b>" : "No";
        },
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      {
        field: "acf.year_made_reportable",
        title: "Year Made Reportable",
        width: 100,
        editor: yearMadeReportableEditor,
        template: function (dataItem) {
          if (dataItem.acf && dataItem.acf.year_made_reportable) {
            var date = new Date(dataItem.acf.year_made_reportable);
            return kendo.toString(date, "yyyy");
          }
          return "";
        },
        attributes: {
          class: "word-wrap",
        },
        headerAttributes: {
          class: "word-wrap",
        },
      },
      /*{
        field: "acf.srca_approved",
        title: "Approved",
        width: 100,
        editable: function (dataItem) {
          return false;
        },
        //editor: approvedDropdownEditor,
        template: function (dataItem) {
          return dataItem["acf"]["srca_approved"] ? "<b>Yes</b>" : "No";
        },
        attributes: {
          class: "word-wrap"
        },
        headerAttributes: {
          class: "word-wrap"
        }
      },*/
      {
        command: [{name: "createchild", text: "Add child"}, "edit"],
      },
    ],
    save: function (e) {
      /* The result can be observed in the DevTools(F12) console of the browser. */
      console.log("save row");

      // Check if all timeframes are set to their default values
      var allDefaultTimeframes =
        e.model.acf.main_timeframe_1 === DEFAULT_TIMEFRAMES.main_timeframe_1 &&
        e.model.acf.main_timeframe_2 === DEFAULT_TIMEFRAMES.main_timeframe_2 &&
        e.model.acf.main_timeframe_3 === DEFAULT_TIMEFRAMES.main_timeframe_3 &&
        e.model.acf.main_timeframe_4 === DEFAULT_TIMEFRAMES.main_timeframe_4;

      // If all timeframes are default, set reportable_state to true

      e.model.set("acf.reportable_state", !allDefaultTimeframes);
    },
    dataBound: function (e) {
      console.log("TreeList data bound. DataSource:", this.dataSource.data());
    },
  });

  updateTimeframeColumns();
}

function updateTimeframeColumns() {
  var treeList = $("#treelist").data("kendoTreeList");

  if (!treeList) {
    console.error("TreeList not initialized");
    return;
  }

  console.log("myStateData:", myStateData);

  const timeframeConfigs = [
    {
      field: "acf.main_timeframe_1",
      reportTypeKey: "report-type-1",
      list: reportType1List,
    },
    {
      field: "acf.main_timeframe_2",
      reportTypeKey: "report-type-2",
      list: reportType2List,
    },
    {
      field: "acf.main_timeframe_3",
      reportTypeKey: "report-type-3",
      list: reportType3List,
    },
    {
      field: "acf.main_timeframe_4",
      reportTypeKey: "report-type-4",
      list: reportType4List,
    },
  ];

  timeframeConfigs.forEach((config) => {
    console.log(`Processing ${config.field}:`);
    const reportTypeIds = myStateData[config.reportTypeKey];
    console.log(`reportTypeIds for ${config.reportTypeKey}:`, reportTypeIds);
    console.log(`${config.field} list:`, config.list);

    if (!reportTypeIds || reportTypeIds.length === 0) {
      console.log(`Hiding column ${config.field}`);
      treeList.hideColumn(config.field);
    } else {
      const reportTypeNames = reportTypeIds
        .map((id) => {
          const reportType = config.list.find((rt) => rt.id === id);
          console.log(`Searching for id: ${id}, Found:`, reportType);
          return reportType ? reportType.name : "";
        })
        .filter((name) => name !== "");

      console.log(`reportTypeNames for ${config.field}:`, reportTypeNames);

      if (reportTypeNames.length > 0) {
        const newTitle = reportTypeNames.join(", ");
        console.log(`New title for ${config.field}:`, newTitle);
        treeList.showColumn(config.field);

        // Update the column title
        var column = treeList.columns.find((c) => c.field === config.field);
        if (column) {
          column.title = newTitle;
          console.log(`Updated column title for ${config.field} to:`, newTitle);
        } else {
          console.log(`Column not found for ${config.field}`);
        }

        // Also update the visible header text
        $(`#treelist th[data-field="${config.field}"] .k-column-title`).text(
          newTitle
        );
        console.log(
          `Updated visible header text for ${config.field} to:`,
          newTitle
        );
      } else {
        console.log(
          `Hiding column ${config.field} due to empty reportTypeNames`
        );
        treeList.hideColumn(config.field);
      }
    }
  });

  // Force a redraw of the TreeList
  treeList.refresh();
  console.log("TreeList refreshed");

  // Add verification of column visibility
  timeframeConfigs.forEach((config) => {
    const column = treeList.columns.find((c) => c.field === config.field);
    if (column) {
      console.log(`${config.field} visibility:`, !column.hidden);
    } else {
      console.log(`${config.field}: Column not found`);
    }
  });
}

function timeframeTemplate(field) {
  return function (dataItem) {
    var timeframeId = dataItem.acf && dataItem.acf[field];
    if (!timeframeId) {
      return "N/A";
    }
    var timeframeList;
    switch (field) {
      case "main_timeframe_1":
        timeframeList = timeframe1List;
        break;
      case "main_timeframe_2":
        timeframeList = timeframe2List;
        break;
      case "main_timeframe_3":
        timeframeList = timeframe3List;
        break;
      case "main_timeframe_4":
        timeframeList = timeframe4List;
        break;
      default:
        return "Unknown";
    }

    var timeframe = timeframeList.find(function (tf) {
      return tf.id === timeframeId;
    });

    return timeframe ? timeframe.name : "Unknown";
  };
}

function updateTreeList() {
  console.log("Checking if TreeList exists:", $("#treeList").length);
  console.log("Updating TreeList data...");
  var treeList = $("#treeList").data("kendoTreeList");
  if (treeList) {
    treeList.dataSource.read();
    treeList.refresh();
  } else {
    console.log("TreeList not initialized or element not found");
  }
}

function updateStateData(data) {
  myStateData = data;
  console.log("myStateData loaded:", JSON.stringify(myStateData, null, 2));
  updateTimeframeColumns();
}

// Function to update the reportable_state based on timeframe values
function updateReportableState(model) {
  var allDefaultTimeframes =
    model.acf.main_timeframe_1 === DEFAULT_TIMEFRAMES.main_timeframe_1 &&
    model.acf.main_timeframe_2 === DEFAULT_TIMEFRAMES.main_timeframe_2 &&
    model.acf.main_timeframe_3 === DEFAULT_TIMEFRAMES.main_timeframe_3 &&
    model.acf.main_timeframe_4 === DEFAULT_TIMEFRAMES.main_timeframe_4;

  model.set("acf.reportable_state", allDefaultTimeframes);
}

function conditionCategoryDropdown(container, options) {
  $('<input required name="' + options.field + '"/>')
    .appendTo(container)
    .kendoDropDownList({
      dataTextField: "name",
      dataValueField: "id",
      dataSource: categoryList,
      value: options.model.acf.main_condition_category || null,
      change: function (e) {
        var selectedValue = this.value();
        var acf = options.model.acf || {};
        acf.main_condition_category = selectedValue
          ? Number(selectedValue)
          : null;
        options.model.set("acf", acf);
      },
    });
}

// Update the timeframe dropdown editors to call updateReportableState
function timeframeDropdown(container, options, dataSource, field) {
  $('<input name="' + options.field + '"/>')
    .appendTo(container)
    .kendoDropDownList({
      dataTextField: "name",
      dataValueField: "id",
      dataSource: dataSource,
      optionLabel: "Select a timeframe...",
      value: options.model.acf[field] || null,
      change: function (e) {
        var selectedValue = this.value();
        var acf = options.model.acf || {};
        acf[field] = selectedValue ? Number(selectedValue) : null;
        options.model.set("acf", acf);
      },
    });
}

function timeframe1Dropdown(container, options) {
  timeframeDropdown(container, options, timeframe1List, "main_timeframe_1");
}

function timeframe2Dropdown(container, options) {
  timeframeDropdown(container, options, timeframe2List, "main_timeframe_2");
}

function timeframe3Dropdown(container, options) {
  timeframeDropdown(container, options, timeframe3List, "main_timeframe_3");
}

function timeframe4Dropdown(container, options) {
  timeframeDropdown(container, options, timeframe4List, "main_timeframe_4");
}

function reportableDropdownEditor(container, options) {
  $('<input name="' + options.field + '"/>')
    .appendTo(container)
    .kendoDropDownList({
      dataSource: [
        {text: "Yes", value: true},
        {text: "No", value: false},
      ],
      dataTextField: "text",
      dataValueField: "value",
      valuePrimitive: true,
      value:
        options.model.acf && options.model.acf.reportable_state !== undefined
          ? options.model.acf.reportable_state
          : false,
      change: function (e) {
        var selectedValue = this.value();
        if (!options.model.acf) {
          options.model.acf = {};
        }
        options.model.set("acf.reportable_state", selectedValue);
      },
    });
}

function approvedDropdownEditor(container, options) {
  $('<input name="' + options.field + '"/>')
    .appendTo(container)
    .kendoDropDownList({
      dataSource: [
        {text: "Yes", value: true},
        {text: "No", value: false},
      ],
      dataTextField: "text",
      dataValueField: "value",
      valuePrimitive: true,
      value:
        options.model.acf && options.model.acf.srca_approved !== undefined
          ? options.model.acf.srca_approved
          : false,
      change: function (e) {
        var selectedValue = this.value();
        if (!options.model.acf) {
          options.model.acf = {};
        }
        options.model.set("acf.srca_approved", selectedValue);
      },
    });
}

function nncDropdownEditor(container, options) {
  $('<input name="nnc"/>')
    .appendTo(container)
    .kendoDropDownList({
      dataSource: [
        {text: "Yes", value: true},
        {text: "No", value: false},
      ],
      dataTextField: "text",
      dataValueField: "value",
      value: options.model.get("acf").nnc,
      change: function (e) {
        var acf = options.model.get("acf");
        acf.nnc = this.value();
        options.model.set("acf", acf);
      },
    });
}

function yearMadeReportableEditor(container, options) {
  $('<input  name="year_made_reportable"/>')
    .appendTo(container)
    .kendoDatePicker({
      format: "yyyy-MM-dd",
      value: options.model.acf.year_made_reportable
        ? new Date(options.model.acf.year_made_reportable)
        : null,
      change: function (e) {
        var acf = options.model.acf || {};
        acf.year_made_reportable = this.value()
          ? kendo.toString(this.value(), "yyyy-MM-dd")
          : null;
        options.model.set("acf", acf);
      },
    });
}
function getJSONfromUrl(url) {
  return new Promise((resolve, reject) => {
    // Remove the base URL if it's present
    const path = url.replace(/^https?:\/\/[^\/]+\/wp-json/, "");

    wp.apiRequest({
      path: path,
      method: "GET",
    })
      .done(function (data) {
        console.log("Successfully fetched data from " + path, data);
        resolve(data);
      })
      .fail(function (error) {
        console.error("Error fetching data from " + path, error);
        reject(error);
      });
  });
}

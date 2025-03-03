var jurisdictionId = null;
var currentUserId = null;
var jurisdictionUsersList = [];
var jurisdictionData = null;
var reportType1List = [];
var reportType2List = [];
var reportType3List = [];
var reportType4List = [];

var currentUserInfoUrl =
  "https://srcadev.wpenginepowered.com/wp-json/wp/v2/users/me";
var baseStateUrl = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/state/";
var baseUserUrlForFilter =
  "https://srcadev.wpenginepowered.com/wp-json/wp/v2/users?state_1=";
var baseUserUrl = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/users";
var reportType1Url = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/report-type-1?_fields=id,name";
var reportType2Url = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/report-type-2?_fields=id,name";
var reportType3Url = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/report-type-3?_fields=id,name";
var reportType4Url = "https://srcadev.wpenginepowered.com/wp-json/wp/v2/report-type-4?_fields=id,name";

$(document).ready(function () {
  console.log("Fetching current user information from:", currentUserInfoUrl);

  //START: Fetch the jurisdiction ID for the current user
  $.ajax({
    url: currentUserInfoUrl,
    type: "GET",
    dataType: "json",
    xhrFields: {
      withCredentials: true,
    },
    beforeSend: function (xhr) {
      console.log(
        "Setting X-WP-Nonce header for user information (Get JurisdictionID) request"
      );
      xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
    },
    success: function (data) {
      jurisdictionId = data.acf.state_1.ID;
      currentUserId = data.id;

      console.log(
        "User information retrieved, jurisdiction ID:",
        jurisdictionId
      );

      // Collect all promises from getJSONfromUrl calls
      Promise.all([
        getJSONfromUrl(
          baseUserUrlForFilter + jurisdictionId + "&_fields=id,name"
        ).then((data) => (jurisdictionUsersList = data)),

        getJSONfromUrl(
          baseStateUrl + jurisdictionId + "?_fields=id,title"
        ).then((data) => (jurisdictionData = data)),
        
        getJSONfromUrl(reportType1Url).then((data) => (reportType1List = data)),
        getJSONfromUrl(reportType2Url).then((data) => (reportType2List = data)),
        getJSONfromUrl(reportType3Url).then((data) => (reportType3List = data)),
        getJSONfromUrl(reportType4Url).then((data) => (reportType4List = data)),
      ])
        .then(() => {
          // Once all data is fetched, initialize the grids
          //initializeJurisdictionDatasource(jurisdictionId);
          updateStateTitle(jurisdictionData.title.rendered);
          initializeReportTypeGrid();
          initializeUserGrid();
        })
        .catch((error) => {
          console.error("Error fetching one or more resources:", error);
        });
    },
    error: function (xhr, status, error) {
      console.error("Error fetching user information:", error);
    },
  });
  //END: Fetch the jurisdiction ID for the current user
});

function updateStateTitle(stateName) {
  $("#state-title .et_pb_text_inner h1").text(stateName + " Users").css("color", "#3831bc");
}

// Initialize report type grid for the state
function initializeReportTypeGrid() {
  var reportTypeDataSource = new kendo.data.DataSource({
    transport: {
      read: function(e) {
        // When reading, we need to format the state's report types into a format for the grid
        $.ajax({
          url: baseStateUrl + jurisdictionId,
          dataType: "json",
          beforeSend: function(xhr) {
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          success: function(data) {
            console.log("State data received:", data);
            
            // Debug the structure of report types in API response
            console.log("Report type 1 in API:", data["report-type-1"]);
            console.log("Report type 1 structure:", typeof data["report-type-1"], Array.isArray(data["report-type-1"]));
            
            // Initialize the data structure - ensure we have proper arrays
            const stateReportTypes = {
              id: data.id,
              title: data.title.rendered,
              report_type_1: ensureArray(data["report-type-1"]),
              report_type_2: ensureArray(data["report-type-2"]),
              report_type_3: ensureArray(data["report-type-3"]),
              report_type_4: ensureArray(data["report-type-4"])
            };
            
            console.log("Formatted state report types:", stateReportTypes);
            
            // Check report type lists
            console.log("Report type 1 list:", reportType1List);
            
            e.success([stateReportTypes]); // We're editing a single state record
          },
          error: function(xhr, status, error) {
            console.error("Error fetching state data:", error);
            e.error(xhr, status, error);
          }
        });
      },
      update: function(options) {
        const data = options.data;
        console.log("Update report types with data:", data);
        
        // Ensure we have proper arrays before sending to API
        const updateData = {
          "report-type-1": ensureArray(data.report_type_1),
          "report-type-2": ensureArray(data.report_type_2),
          "report-type-3": ensureArray(data.report_type_3),
          "report-type-4": ensureArray(data.report_type_4)
        };
        
        console.log("Sending update data to API:", updateData);
        
        $.ajax({
          url: baseStateUrl + jurisdictionId,
          type: "POST",
          dataType: "json",
          contentType: "application/json",
          data: JSON.stringify(updateData),
          beforeSend: function(xhr) {
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          success: function(response) {
            console.log("Report types updated successfully:", response);
            
            // Transform the response back to grid format to ensure consistent display
            const updatedData = {
              id: response.id,
              title: response.title.rendered,
              report_type_1: ensureArray(response["report-type-1"]),
              report_type_2: ensureArray(response["report-type-2"]),
              report_type_3: ensureArray(response["report-type-3"]),
              report_type_4: ensureArray(response["report-type-4"])
            };
            
            console.log("Transformed update response:", updatedData);
            options.success(updatedData);
            
            // Force a refresh of the grid to ensure data is displayed properly
            setTimeout(function() {
              var grid = $("#reportTypeGrid").data("kendoGrid");
              grid.dataSource.read();
            }, 500);
          },
          error: function(xhr, status, error) {
            console.error("Error updating report types:", error);
            options.error(xhr, status, error);
          }
        });
      }
    },
    schema: {
      model: {
        id: "id",
        fields: {
          id: { editable: false, nullable: false },
          title: { editable: false, type: "string" },
          report_type_1: { defaultValue: [] },
          report_type_2: { defaultValue: [] },
          report_type_3: { defaultValue: [] },
          report_type_4: { defaultValue: [] }
        }
      },
      parse: function(response) {
        console.log("Schema parse called with:", response);
        
        // Ensure consistent data format when parsing response
        if (Array.isArray(response)) {
          return response.map(item => ({
            ...item,
            report_type_1: ensureArray(item.report_type_1),
            report_type_2: ensureArray(item.report_type_2),
            report_type_3: ensureArray(item.report_type_3),
            report_type_4: ensureArray(item.report_type_4)
          }));
        } else {
          // If response is a single object, transform it to expected format
          return [{
            id: response.id,
            title: response.title.rendered,
            report_type_1: ensureArray(response["report-type-1"]),
            report_type_2: ensureArray(response["report-type-2"]),
            report_type_3: ensureArray(response["report-type-3"]),
            report_type_4: ensureArray(response["report-type-4"])
          }];
        }
      }
    }
  });
  
  // Create the grid
  $("#reportTypeGrid").kendoGrid({
    dataSource: reportTypeDataSource,
    height: 250,
    toolbar: ["save", "cancel"],
    columns: [
      { 
        field: "title", 
        title: "State", 
        width: "150px",
        template: function(dataItem) {
          return dataItem.title || "Loading...";
        } 
      },
      { 
        field: "report_type_1", 
        title: "Report Type 1", 
        editor: reportTypeDropdownEditor("report_type_1", reportType1List),
        template: function(dataItem) {
          console.log("Rendering report_type_1:", dataItem.report_type_1);
          console.log("Raw data item for report_type_1:", JSON.stringify(dataItem));
          return formatReportTypes(dataItem.report_type_1, reportType1List);
        }
      },
      { 
        field: "report_type_2", 
        title: "Report Type 2", 
        editor: reportTypeDropdownEditor("report_type_2", reportType2List),
        template: function(dataItem) {
          console.log("Rendering report_type_2:", dataItem.report_type_2);
          console.log("Raw data item for report_type_2:", JSON.stringify(dataItem));
          return formatReportTypes(dataItem.report_type_2, reportType2List);
        }
      },
      { 
        field: "report_type_3", 
        title: "Report Type 3", 
        editor: reportTypeDropdownEditor("report_type_3", reportType3List),
        template: function(dataItem) {
          console.log("Rendering report_type_3:", dataItem.report_type_3);
          console.log("Raw data item for report_type_3:", JSON.stringify(dataItem));
          return formatReportTypes(dataItem.report_type_3, reportType3List);
        }
      },
      { 
        field: "report_type_4", 
        title: "Report Type 4", 
        editor: reportTypeDropdownEditor("report_type_4", reportType4List),
        template: function(dataItem) {
          console.log("Rendering report_type_4:", dataItem.report_type_4);
          console.log("Raw data item for report_type_4:", JSON.stringify(dataItem));
          return formatReportTypes(dataItem.report_type_4, reportType4List);
        }
      }
    ],
    editable: true,
    save: function(e) {
      console.log("Grid save event triggered with data:", e.values);
    }
  });
}

// Helper function to ensure we have an array
function ensureArray(value) {
  if (value === null || value === undefined) {
    return [];
  }
  
  // If it's already a proper array of simple values (numbers/strings), return it
  if (Array.isArray(value) && value.every(item => typeof item !== 'object')) {
    return value;
  }
  
  // Handle Kendo UI data structures which have numeric properties and a length property
  if (typeof value === 'object' && value !== null && 'length' in value) {
    // Extract numeric properties which are likely the IDs
    const extractedIds = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== undefined) {
        // If the value at index i is a simple value (number/string)
        if (typeof value[i] !== 'object') {
          extractedIds.push(value[i]);
        } 
        // If it's an object with ID or id property
        else if (value[i] && (value[i].ID !== undefined || value[i].id !== undefined)) {
          extractedIds.push(value[i].ID || value[i].id);
        }
      }
    }
    console.log("Extracted IDs from Kendo object:", extractedIds);
    return extractedIds;
  }
  
  // Handle case where it's a complex object with raw property
  if (typeof value === 'object' && value !== null) {
    // Handle WordPress REST API specific structures
    if (Array.isArray(value.raw)) {
      return value.raw;
    }
    
    // If it's a single object with ID or id property
    if (value.ID !== undefined || value.id !== undefined) {
      return [value.ID || value.id];
    }
  }
  
  // If it's a primitive value like a number, make it an array with that single value
  if (typeof value !== 'object') {
    return [value];
  }
  
  // If all else fails, return empty array
  console.warn("Could not convert to array:", value);
  return [];
}

// Helper function to format report types for display
function formatReportTypes(ids, reportTypeList) {
  console.log("formatReportTypes called with ids:", ids, "and list:", reportTypeList);
  
  if (!ids || (Array.isArray(ids) && ids.length === 0)) {
    return "None";
  }
  
  // Ensure we have an array to work with
  const idArray = ensureArray(ids);
  console.log("Processed IDs for display:", idArray);
  
  if (idArray.length === 0) {
    return "None";
  }
  
  const formattedNames = idArray.map(id => {
    // Handle cases where id might be an object
    const actualId = typeof id === 'object' && id !== null ? (id.ID || id.id) : id;
    
    const reportType = reportTypeList.find(rt => rt.id === actualId);
    console.log(`Looking for report type with id ${actualId}:`, reportType);
    return reportType ? reportType.name : "";
  }).filter(name => name !== "");
  
  return formattedNames.length > 0 ? formattedNames.join(", ") : "None";
}

// Create a multiselect dropdown editor for report types
function reportTypeDropdownEditor(field, dataSource) {
  return function(container, options) {
    console.log(`Creating editor for ${field} with options:`, options.model[field]);
    console.log(`DataSource for ${field}:`, dataSource);
    
    $('<select multiple="multiple" data-bind="value:' + field + '" />')
      .appendTo(container)
      .kendoMultiSelect({
        placeholder: "Select report types...",
        dataTextField: "name",
        dataValueField: "id",
        dataSource: dataSource,
        value: ensureArray(options.model[field])
      });
  };
}

// Initialize user grid
function initializeUserGrid() {
  var userDataSource = new kendo.data.DataSource({
    transport: {
      read: function (e) {
        $.ajax({
          url:
            baseUserUrlForFilter +
            jurisdictionId +
            "&_fields=id,first_name,last_name,email,acf",
          dataType: "json",
          beforeSend: function (xhr) {
            console.log("Preparing to send request to:", this.url);
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          success: function (data, textStatus, xhr) {
            console.log(
              "User Read successful, status:",
              textStatus,
              "data received:",
              data.length,
              "records"
            );
            console.log(
              "User Read successful, status:",
              textStatus,
              "data received:",
              data
            );
            console.log("User read success. Data received:", data);
            e.success(data);
          },
          error: function (xhr, textStatus, errorThrown) {
            console.error(
              "Error reading data:",
              textStatus,
              "Error thrown:",
              errorThrown,
              "HTTP Status:",
              xhr.status,
              "Response text:",
              xhr.responseText
            );
          },
          complete: function (xhr, textStatus) {
            console.log("Request completed with status:", textStatus);
          },
        });
      },
      create: function (e) {
        $.ajax({
          url: baseUserUrl,
          type: "POST",
          contentType: "application/json",
          beforeSend: function (xhr) {
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          data: JSON.stringify({
            username: e.data.email,
            email: e.data.email,
            first_name: e.data.first_name,
            last_name: e.data.last_name,
            password: generateTemporaryPassword(),
            acf: {
              state_1: jurisdictionId,
            },
          }),
          success: function (response) {
            console.log("User created successfully:", response);
            e.success(response);
            userDataSource.read();
          },
          error: function (xhr, status, error) {
            console.error("Error creating user:", error);
            e.error(xhr, status, error);
          },
        });
      },
      update: function (options) {
        var data = options.data;
        console.log("Update function called with data:", data);

        $.ajax({
          url: baseUserUrl + "/" + data.id,
          type: "POST",
          dataType: "json",
          contentType: "application/json",
          data: JSON.stringify({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
          }),
          beforeSend: function (xhr) {
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          success: function (response) {
            console.log("Update successful, server response:", response);
            options.success(response);
          },
          error: function (xhr, status, error) {
            console.error("Error updating user:", error);
            options.error(xhr, status, error);
          },
        });
      },
      destroy: function (options) {
        $.ajax({
          url: baseUserUrl + "/" + options.data.id + "?force=true",
          type: "DELETE",
          dataType: "json",
          beforeSend: function (xhr) {
            xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
          },
          data: {
            reassign: null,
          },
          success: function (result) {
            console.log("User deleted successfully:", result);
            options.success(result);
          },
          error: function (xhr, status, error) {
            console.error("Error deleting user:", error);
            options.error(xhr, status, error);
          },
        });
      },
      parameterMap: function (data, type) {
        console.log("Data:", data);
        console.log(kendo.stringify(data));
        return kendo.stringify(data);
      },
    },
    batch: false,
    pageSize: 20,
    schema: {
      model: {
        id: "id",
        fields: {
          id: {editable: false, nullable: false},
          first_name: {type: "string"},
          last_name: {type: "string"},
          email: {type: "string"},
          acf: {
            state_1: {
              field: "acf.state_1",
              type: "number",
              defaultValue: 63,
            },
          },
        },
      },
    },
  });

  $("#jurisdictionTable").kendoGrid({
    dataSource: userDataSource,
    pageable: true,
    className: "word-wrap-grid",
    height: 550,
    toolbar: [{name: "create", text: "Add New User"}, "save", "cancel"],
    columns: [
      {field: "first_name", title: "First Name"},
      {field: "last_name", title: "Last Name"},
      {field: "email", title: "Email"},
      {command: ["edit", "destroy"], title: "&nbsp;"},
    ],
    editable: "inline",
  });
}

// Generate temporary password for new users
function generateTemporaryPassword(length = 12) {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const specialChars = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

  let password = "";

  password += uppercaseChars.charAt(
    Math.floor(Math.random() * uppercaseChars.length)
  );
  password += lowercaseChars.charAt(
    Math.floor(Math.random() * lowercaseChars.length)
  );
  password += numberChars.charAt(
    Math.floor(Math.random() * numberChars.length)
  );
  password += specialChars.charAt(
    Math.floor(Math.random() * specialChars.length)
  );

  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

function getJSONfromUrl(url) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      type: "GET",
      dataType: "json",
      xhrFields: {
        withCredentials: true,
      },
      beforeSend: function (xhr) {
        console.log(
          "Setting X-WP-Nonce header for getJSONfromUrl function for: ",
          url
        );
        xhr.setRequestHeader("X-WP-Nonce", wpApiSettings.nonce);
      },
      success: function (data) {
        resolve(data); // Resolve the promise with the data
      },
      error: function (xhr, status, error) {
        reject(error); // Reject the promise with the error
      },
    });
  });
}

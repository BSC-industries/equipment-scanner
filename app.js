/*
 * Equipment Scanner
 * Main application JavaScript
 */


const STORAGE_KEY = "equipment-records-v1";


const STATUSES = [
    "Hylla",
    "Verkstad",
    "Flytt",
    "Tillbehör"
];


let records = loadRecords();


let editingId = null;


let cameraStream = null;


/*
 * Small helper for finding elements.
 */

function $(id) {

    return document.getElementById(id);

}


/*
 * Load records from localStorage.
 */

function loadRecords() {

    let saved = [];


    try {

        saved = JSON.parse(
            localStorage.getItem(
                STORAGE_KEY
            ) || "[]"
        );

    } catch (error) {

        saved = [];

    }


    /*
     * Migrate older records.
     *
     * Older versions could store:
     *
     * status = "Tvätthallen"
     *
     * Convert that into:
     *
     * status = ""
     * tvatthallen = true
     */

    saved = saved.map(
        function (record) {

            const migrated =
                Object.assign(
                    {},
                    record
                );


            if (
                migrated.status ===
                "Tvätthallen"
            ) {

                migrated.status = "";

                migrated.tvatthallen = true;

            }


            if (
                typeof migrated.tvatthallen !==
                "boolean"
            ) {

                migrated.tvatthallen = false;

            }


            return migrated;

        }
    );


    return saved;

}


/*
 * Save all records.
 */

function saveRecords() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
    );

}


/*
 * Generate a simple unique ID.
 */

function makeId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );

}


/*
 * Validate equipment number.
 *
 * Must contain exactly 5 or 6 digits.
 */

function validNumber(number) {

    return /^\d{5,6}$/.test(
        number
    );

}


/*
 * Escape HTML.
 */

function escapeHtml(value) {

    return String(value || "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
 * Return all tags belonging to a record.
 *
 * Tvätthallen is a special tag and can be
 * combined with exactly one normal status.
 */

function getTags(record) {

    const tags = [];


    if (record.status) {

        tags.push(
            record.status
        );

    }


    if (record.tvatthallen) {

        tags.push(
            "Tvätthallen"
        );

    }


    return tags;

}


/*
 * Check whether a record has a given
 * status/tag.
 */

function hasStatus(
    record,
    status
) {

    if (
        status ===
        "Tvätthallen"
    ) {

        return !!record.tvatthallen;

    }


    return (
        record.status ===
        status
    );

}


/*
 * Create visual badges for a record.
 */

function recordBadges(record) {

    const tags =
        getTags(record);


    if (tags.length === 0) {

        return "";

    }


    return tags
        .map(
            function (tag) {

                let className =
                    tag
                        .toLowerCase()
                        .replace(
                            /å/g,
                            "a"
                        )
                        .replace(
                            /ä/g,
                            "a"
                        )
                        .replace(
                            /ö/g,
                            "o"
                        );


                return (
                    '<span class="badge ' +
                    className +
                    '">' +
                    escapeHtml(tag) +
                    "</span>"
                );

            }
        )
        .join(" ");

}


/*
 * Render the equipment list.
 */

function render() {

    const list =
        $("list");


    const search =
        $("search")
            .value
            .trim()
            .toLowerCase();


    const filter =
        $("filter")
            .value;


    let visible =
        records.filter(
            function (record) {

                const searchable =
                    (
                        record.number +
                        " " +
                        record.notes +
                        " " +
                        getTags(record).join(" ")
                    )
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.indexOf(search) !== -1;


                const matchesFilter =
                    !filter ||
                    hasStatus(
                        record,
                        filter
                    );


                return (
                    matchesSearch &&
                    matchesFilter
                );

            }
        );


    /*
     * Sort equipment numbers naturally.
     */

    visible.sort(
        function (a, b) {

            return a.number.localeCompare(
                b.number,
                undefined,
                {
                    numeric: true
                }
            );

        }
    );


    if (visible.length === 0) {

        list.innerHTML =
            '<div class="empty">' +
            "No equipment found." +
            "</div>";

        return;

    }


    list.innerHTML =
        visible
            .map(
                function (record) {

                    return (
                        '<div class="item" ' +
                        'tabindex="0" ' +
                        'data-id="' +
                        escapeHtml(record.id) +
                        '">' +

                            '<div class="row between">' +

                                '<div class="number">' +
                                    escapeHtml(
                                        record.number
                                    ) +
                                "</div>" +

                                '<div class="row">' +
                                    recordBadges(
                                        record
                                    ) +
                                "</div>" +

                            "</div>" +


                            (
                                record.notes
                                    ? (
                                        '<div style="margin-top: 7px;">' +
                                            escapeHtml(
                                                record.notes
                                            ) +
                                        "</div>"
                                    )
                                    : ""
                            ) +


                            '<div class="muted" style="margin-top: 6px;">' +
                                "Tap to edit" +
                            "</div>" +

                        "</div>"
                    );

                }
            )
            .join("");


    /*
     * Make the entire equipment row clickable.
     */

    document
        .querySelectorAll(
            ".item"
        )
        .forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        editRecord(
                            item.dataset.id
                        );

                    }
                );


                item.addEventListener(
                    "keydown",
                    function (event) {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            editRecord(
                                item.dataset.id
                            );

                        }

                    }
                );

            }
        );

}


/*
 * Show one application section.
 */

function showSection(
    sectionId
) {

    $("home")
        .classList
        .add("hidden");


    $("scanner")
        .classList
        .add("hidden");


    $("editor")
        .classList
        .add("hidden");


    $(sectionId)
        .classList
        .remove("hidden");

}


/*
 * Open the editor for a new record.
 */

function newRecord(
    number
) {

    editingId = null;


    $("editorTitle")
        .textContent =
        "Add Equipment";


    $("number")
        .value =
        number || "";


    $("notes")
        .value =
        "";


    $("status")
        .value =
        "Hylla";


    $("tvatthallen")
        .checked =
        false;


    $("delete")
        .classList
        .add("hidden");


    showSection(
        "editor"
    );


    $("number")
        .focus();

}


/*
 * Open the editor for an existing record.
 */

function editRecord(id) {

    const record =
        records.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!record) {

        return;

    }


    editingId =
        id;


    $("editorTitle")
        .textContent =
        "Edit Equipment";


    $("number")
        .value =
        record.number || "";


    $("notes")
        .value =
        record.notes || "";


    /*
     * Important:
     *
     * Empty status is allowed when
     * Tvätthallen is the only tag.
     */

    $("status")
        .value =
        record.status || "";


    $("tvatthallen")
        .checked =
        !!record.tvatthallen;


    $("delete")
        .classList
        .remove("hidden");


    showSection(
        "editor"
    );

}


/*
 * Save the current record.
 */

function saveCurrentRecord() {

    const number =
        $("number")
            .value
            .trim();


    const notes =
        $("notes")
            .value
            .trim();


    const status =
        $("status")
            .value;


    const tvatthallen =
        $("tvatthallen")
            .checked;


    if (!validNumber(number)) {

        alert(
            "Equipment number must contain exactly 5 or 6 digits."
        );

        $("number")
            .focus();

        return;

    }


    /*
     * There must be at least one tag/status.
     *
     * Either:
     *
     * Hylla
     * Verkstad
     * Flytt
     * Tillbehör
     *
     * or:
     *
     * Tvätthallen
     */

    if (
        !status &&
        !tvatthallen
    ) {

        alert(
            "Select a status or Tvätthallen."
        );

        return;

    }


    /*
     * Prevent normal-status combinations.
     *
     * There is only one normal-status select,
     * so this is automatically enforced.
     *
     * Tvätthallen is the only additional tag.
     */

    if (editingId) {

        const record =
            records.find(
                function (item) {

                    return (
                        item.id ===
                        editingId
                    );

                }
            );


        if (!record) {

            return;

        }


        record.number =
            number;


        record.notes =
            notes;


        record.status =
            status;


        record.tvatthallen =
            tvatthallen;


        record.updatedAt =
            new Date().toISOString();

    } else {

        records.push({

            id:
                makeId(),

            number:
                number,

            notes:
                notes,

            status:
                status,

            tvatthallen:
                tvatthallen,

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        });

    }


    saveRecords();


    render();


    showSection(
        "home"
    );

}


/*
 * Delete the current record.
 */

function deleteCurrentRecord() {

    if (!editingId) {

        return;

    }


    const record =
        records.find(
            function (item) {

                return item.id === editingId;

            }
        );


    if (!record) {

        return;

    }


    const confirmed =
        confirm(
            "Delete equipment " +
            record.number +
            "?"
        );


    if (!confirmed) {

        return;

    }


    records =
        records.filter(
            function (item) {

                return item.id !== editingId;

            }
        );


    saveRecords();


    editingId = null;


    render();


    showSection(
        "home"
    );

}


/*
 * Start the camera.
 */

async function openCamera() {

    showSection(
        "scanner"
    );


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },
                    audio: false
                }
            );


        $("camera")
            .srcObject =
            cameraStream;


    } catch (error) {

        alert(
            "Camera could not be opened. " +
            "Make sure camera permission is allowed " +
            "and the app is running over HTTPS."
        );

    }

}


/*
 * Stop the camera.
 */

function closeCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );


        cameraStream =
            null;

    }


    $("camera")
        .srcObject =
        null;


    showSection(
        "home"
    );

}


/*
 * Capture an image from the camera.
 *
 * This version does not perform OCR.
 * The user confirms/types the number manually.
 */

function captureNumber() {

    const video =
        $("camera");


    const canvas =
        $("canvas");


    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        alert(
            "Camera image is not ready yet."
        );

        return;

    }


    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    $("captureResult")
        .classList
        .remove("hidden");


    $("capturedNumber")
        .value =
        "";


    $("capturedNumber")
        .focus();

}


/*
 * Use the manually confirmed captured number.
 */

function useCapturedNumber() {

    const number =
        $("capturedNumber")
            .value
            .trim();


    if (!validNumber(number)) {

        $("message")
            .textContent =
            "Enter exactly 5 or 6 digits.";


        $("message")
            .style
            .display =
            "block";


        return;

    }


    $("message")
        .style
        .display =
        "none";


    closeCamera();


    newRecord(
        number
    );

}


/*
 * Create the PDF/print report.
 *
 * IMPORTANT:
 *
 * The equipment number is duplicated when
 * it has two tags.
 *
 * Example:
 *
 * 583921
 * Hylla + Tvätthallen
 *
 * becomes:
 *
 * 1 | 583921 | description | Hylla
 * 2 | 583921 | description | Tvätthallen
 *
 * Rows are sorted by tag first, then
 * equipment number.
 */

function exportPdf() {

    const rows = [];


    records.forEach(
        function (record) {

            const tags =
                getTags(record);


            /*
             * A record should normally always
             * have at least one tag.
             *
             * Keep an empty tag as a fallback
             * for old/incomplete data.
             */

            if (tags.length === 0) {

                rows.push({

                    number:
                        record.number || "",

                    description:
                        record.notes || "",

                    tag:
                        ""

                });


                return;

            }


            /*
             * One exported row per tag.
             */

            tags.forEach(
                function (tag) {

                    rows.push({

                        number:
                            record.number || "",

                        description:
                            record.notes || "",

                        tag:
                            tag

                    });

                }
            );

        }
    );


    /*
     * Sort by tag first.
     *
     * Then sort by equipment number.
     */

    rows.sort(
        function (a, b) {

            const tagA =
                a.tag.toLowerCase();


            const tagB =
                b.tag.toLowerCase();


            if (
                tagA <
                tagB
            ) {

                return -1;

            }


            if (
                tagA >
                tagB
            ) {

                return 1;

            }


            return a.number.localeCompare(
                b.number,
                undefined,
                {
                    numeric: true
                }
            );

        }
    );


    /*
     * Build the printable report.
     */

    let html = "";


    html +=
        "<h1>Equipment List</h1>";


    html +=
        '<div class="printDate">' +
        "Exported: " +
        new Date().toLocaleString(
            "sv-SE"
        ) +
        "</div>";


    html +=
        "<table>";


    html +=
        "<thead>" +
            "<tr>" +
                '<th class="rowNumber">Row</th>' +
                '<th class="equipmentNumber">Equipment number</th>' +
                "<th>Description</th>" +
                '<th class="tag">Tag</th>' +
            "</tr>" +
        "</thead>";


    html +=
        "<tbody>";


    rows.forEach(
        function (row, index) {

            html +=
                "<tr>" +

                    '<td class="rowNumber">' +
                        (index + 1) +
                    "</td>" +

                    '<td class="equipmentNumber">' +
                        escapeHtml(
                            row.number
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            row.description
                        ) +
                    "</td>" +

                    '<td class="tag">' +
                        escapeHtml(
                            row.tag
                        ) +
                    "</td>" +

                "</tr>";

        }
    );


    html +=
        "</tbody>" +
        "</table>";


    const report =
        $("printReport");


    report.innerHTML =
        html;


    /*
     * Wait briefly for the printable
     * content to be inserted.
     */

    setTimeout(
        function () {

            window.print();

        },
        100
    );

}


/*
 * Event: Manual Add.
 */

$("manualAdd")
    .addEventListener(
        "click",
        function () {

            newRecord("");

        }
    );


/*
 * Event: Save.
 */

$("save")
    .addEventListener(
        "click",
        saveCurrentRecord
    );


/*
 * Event: Delete.
 */

$("delete")
    .addEventListener(
        "click",
        deleteCurrentRecord
    );


/*
 * Event: Cancel editing.
 */

$("cancelEdit")
    .addEventListener(
        "click",
        function () {

            showSection(
                "home"
            );

        }
    );


/*
 * Event: Search.
 */

$("search")
    .addEventListener(
        "input",
        render
    );


/*
 * Event: Filter.
 */

$("filter")
    .addEventListener(
        "change",
        render
    );


/*
 * Event: Open camera.
 */

$("openCamera")
    .addEventListener(
        "click",
        openCamera
    );


/*
 * Event: Close camera.
 */

$("closeCamera")
    .addEventListener(
        "click",
        closeCamera
    );


/*
 * Event: Capture.
 */

$("capture")
    .addEventListener(
        "click",
        captureNumber
    );


/*
 * Event: Use captured number.
 */

$("useCaptured")
    .addEventListener(
        "click",
        useCapturedNumber
    );


/*
 * Event: PDF export.
 */

$("exportPdf")
    .addEventListener(
        "click",
        exportPdf
    );


/*
 * Close camera if the page is
 * hidden/navigated away.
 */

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.hidden &&
            cameraStream
        ) {

            closeCamera();

        }

    }
);


/*
 * Register service worker.
 */

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        function () {

            navigator.serviceWorker
                .register(
                    "sw.js"
                )
                .catch(
                    function (error) {

                        console.log(
                            "Service worker registration failed:",
                            error
                        );

                    }
                );

        }
    );

}


/*
 * Initial render.
 */

render();
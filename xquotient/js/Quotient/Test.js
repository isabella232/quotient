// import Nevow.Athena.Test

// import Quotient.Throbber
// import Quotient.Message
// import Quotient.Mailbox
// import Quotient.Compose

Quotient.Test.ThrobberTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.ThrobberTestCase');
Quotient.Test.ThrobberTestCase.methods(
    function setUp(self) {
        self.throbberNode = document.createElement('div');
        self.throbberNode.style.display = 'block';
        self.node.appendChild(self.throbberNode);
        self.throbber = Quotient.Throbber.Throbber(self.throbberNode);
    },

    /**
     * Test that the L{Throbber.startThrobbing} method sets the wrapped node's
     * style so that it is visible.
     */
    function test_startThrobbing(self) {
        self.setUp();

        self.throbber.startThrobbing();
        self.assertEqual(self.throbberNode.style.display, '');
    },

    /**
     * Test that the L{Throbber.stopThrobbing} method sets the wrapped node's
     * style so that it is invisible.
     */
    function test_stopThrobbing(self) {
        self.setUp();

        self.throbber.stopThrobbing();
        self.assertEqual(self.throbberNode.style.display, 'none');
    });


/**
 * Testable stand-in for the real throbber class.  Used by tests to assert that
 * the throbber is manipulated properly.
 */
Quotient.Test.TestThrobber = Divmod.Class.subclass("Quotient.Test.TestThrobber");
Quotient.Test.TestThrobber.methods(
    function __init__(self) {
        self.throbbing = false;
    },

    function startThrobbing(self) {
        self.throbbing = true;
    },

    function stopThrobbing(self) {
        self.throbbing = false;
    });


Quotient.Test.ScrollTableTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.ScrollTableTestCase');
Quotient.Test.ScrollTableTestCase.methods(
    /**
     * Find the ScrollWidget which is a child of this test and save it as a
     * convenient attribute for test methods to use.
     */
    function setUp(self) {
        self.scrollWidget = null;
        for (var i = 0; i < self.childWidgets.length; ++i) {
            if (self.childWidgets[i] instanceof Quotient.Mailbox.ScrollingWidget) {
                self.scrollWidget = self.childWidgets[i];
                break;
            }
        }
        self.assertNotEqual(self.scrollWidget, null, "Could not find ScrollingWidget.")
    },
    /**
     * Test receipt of timestamps from the server and their formatting.
     */
    function test_massageTimestamp(self) {
        self.setUp();
        self.callRemote('getTimestamp').addCallback(function (timestamp) {
                var date = new Date(timestamp*1000);
                self.assertEqual(self.scrollWidget.massageColumnValue(
                            "", "timestamp",
                            timestamp + date.getTimezoneOffset() * 60),
                                 "12:00 AM")});
    },
    /**
     * Test the custom date formatting method used by the Mailbox ScrollTable.
     */
    function test_formatDate(self) {
        self.setUp();

        var now;

        /*
         * August 21, 2006, 1:36:10 PM
         */
        var when = new Date(2006, 7, 21, 13, 36, 10);

        /*
         * August 21, 2006, 5:00 PM
         */
        now = new Date(2006, 7, 21, 17, 0, 0);
        self.assertEqual(
            self.scrollWidget.formatDate(when, now), '1:36 PM',
            "Different hour context failed.");

        self.assertEqual(
            self.scrollWidget.formatDate(new Date(2006, 7, 21, 13, 1, 10),
                                         now), '1:01 PM');
        /*
         * August 22, 2006, 12:00 PM
         */
        now = new Date(2006, 7, 22, 12, 0, 0);
        self.assertEqual(
            self.scrollWidget.formatDate(when, now), 'Aug 21',
            "Different day context failed.");

        /*
         * September 22, 2006, 12:00 PM
         */
        now = new Date(2006, 8, 22, 12, 0, 0);
        self.assertEqual(
            self.scrollWidget.formatDate(when, now), 'Aug 21',
            "Different month context failed.");

        /*
         * January 12, 2007, 9:00 AM
         */
        now = new Date(2007, 1, 12, 9, 0, 0);
        self.assertEqual(
            self.scrollWidget.formatDate(when, now), '2006-08-21',
            "Different year context failed.");
    });


Quotient.Test.ScrollingWidgetTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.ScrollingWidgetTestCase');
Quotient.Test.ScrollingWidgetTestCase.methods(
    function setUp(self) {
        var result = self.callRemote('getScrollingWidget', 5);
        result.addCallback(function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(function(widget) {
                self.scrollingWidget = widget;
                self.node.appendChild(widget.node);

                /*
                 * XXX Clobber these methods, since our ScrollingWidget doesn't
                 * have a widgetParent which implements the necessary methods.
                 */
                widget.decrementActiveMailViewCount = function() {};
                widget.selectionChanged = function selectionChanged() {
                    return Divmod.Defer.succeed(null);
                };

                return widget.initializationDeferred;
            });
        return result;
    },

    /**
     * Test that selecting the first message in a
     * L{Quotient.Mailbox.ScrollingWidget} properly selects it and returns
     * C{null} as the previously selected message webID.
     */
    function test_firstSelectWebID(self) {
        return self.setUp().addCallback(function() {
                var webID = self.scrollingWidget.model.getRowData(0).__id__;
                return self.scrollingWidget._selectWebID(webID).addCallback(
                    function(oldWebID) {
                        self.assertEqual(
                            oldWebID, null,
                            "Expected null as previously selected message ID.");
                    });
            });
    },

    /**
     * Test that selecting another message returns the message ID which was
     * already selected.
     */
    function test_secondSelectWebID(self) {
        return self.setUp().addCallback(function() {
                var webID = self.scrollingWidget.model.getRowData(0).__id__;
                return self.scrollingWidget._selectWebID(webID).addCallback(
                    function(ignored) {
                        var otherWebID = self.scrollingWidget.model.getRowData(1).__id__;
                        return self.scrollingWidget._selectWebID(otherWebID).addCallback(
                            function(oldWebID) {
                                self.assertEqual(
                                    oldWebID, webID,
                                    "Expected first message ID as previous message ID.");
                            });
                    });
            });
    },

    /**
     * Test that the selected web ID determines the row returned by
     * L{getSelectedRow}.
     */
    function test_getSelectedRow(self) {
        return self.setUp().addCallback(function() {
                var webID;

                webID = self.scrollingWidget.model.getRowData(0).__id__;
                self.scrollingWidget._selectWebID(webID);
                self.assertEqual(self.scrollingWidget.getSelectedRow().__id__, webID);

                webID = self.scrollingWidget.model.getRowData(1).__id__;
                self.scrollingWidget._selectWebID(webID);
                self.assertEqual(self.scrollingWidget.getSelectedRow().__id__, webID);

                self.scrollingWidget._selectWebID(null);
                self.assertEqual(self.scrollingWidget.getSelectedRow(), null);
            });
    },

    /**
     * Test that removing the selection by passing C{null} to C{_selectWebID}
     * properly returns the previously selected message ID.
     */
    function test_unselectWebID(self) {
        return self.setUp().addCallback(function() {
                var webID = self.scrollingWidget.model.getRowData(0).__id__;
                return self.scrollingWidget._selectWebID(webID).addCallback(
                    function(ignored) {
                        return self.scrollingWidget._selectWebID(null).addCallback(
                            function(oldWebID) {
                                self.assertEqual(
                                    oldWebID, webID,
                                    "Expected first message ID as previous message ID.");
                            });
                    });
            });
    },

    /**
     * Test that a row can be added to the group selection with
     * L{ScrollingWidget.groupSelectRow} and that the proper state is returned
     * for that row.
     */
    function test_groupSelectRow(self) {
        return self.setUp().addCallback(function() {
                var webID = self.scrollingWidget.model.getRowData(0).__id__;
                var state = self.scrollingWidget.groupSelectRow(webID);
                self.assertEqual(state, "on");
                self.failUnless(
                    webID in self.scrollingWidget.selectedGroup,
                    "Expected selected webID to be in the selected group.");
            });
    },

    /**
     * Test that a row can be removed from the group selection with
     * L{ScrollingWidget.groupSelectRow} and that the proper state is returned
     * for that row.
     */
    function test_groupUnselectRow(self) {
        return self.setUp().addCallback(function() {
                var webID = self.scrollingWidget.model.getRowData(0).__id__;
                self.scrollingWidget.selectedGroup = {};
                self.scrollingWidget.selectedGroup[webID] = null;
                var state = self.scrollingWidget.groupSelectRow(webID);
                self.assertEqual(state, "off");
                self.assertEqual(
                    self.scrollingWidget.selectedGroup, null,
                    "Expected the selected group to be null.");
            });
    },

    /**
     * Test that the height of the node returned by
     * L{Quotient.Mailbox.ScrollingWidget._getRowGuineaPig} isn't set
     */
    function test_guineaPigHeight(self) {
        var result = self.setUp();
        result.addCallback(
            function() {
                var row = self.scrollingWidget._getRowGuineaPig();
                self.failIf(row.style.height);
                var div = row.getElementsByTagName("div")[0];
                self.failIf(div.style.height);
            });
        return result;
    });


Quotient.Test.ControllerTestCase = Nevow.Athena.Test.TestCase.subclass(
    'Quotient.Test.ControllerTestCase');
Quotient.Test.ControllerTestCase.methods(
    /**
     * Utility method to extract data from display nodes and return it as an
     * array of objects mapping column names to values.
     */
    function collectRows(self) {
        var rows = self.controllerWidget.scrollWidget.nodesByAttribute(
            "class", "q-scroll-row");
        var divs, j, row;
        for (var i = 0; i < rows.length; i++) {
            divs = rows[i].getElementsByTagName("div");
            row = {};
            for (j = 0; j < divs.length; j++) {
                row[divs[j].className] = divs[j].firstChild.nodeValue;
            }
            rows[i] = row;
        }
        return rows;
    },

    /**
     * Retrieve a Controller Widget for an inbox from the server.
     */
    function setUp(self) {
        var result = self.callRemote('getControllerWidget');
        result.addCallback(
            function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(function(widget) {
                self.controllerWidget = widget;
                self.node.appendChild(widget.node);
                return self.controllerWidget.scrollWidget.initializationDeferred;
            });
        return result;
    },

    /**
     * Test L{Quotient.Mailbox.Controller.disableActionButtonsUntilFires}
     */
    function test_disableActionButtonsUntilFires(self) {
        var result = self.setUp();
        result.addCallback(
            function(result) {
                var buttons = [];
                for(var k in self.controllerWidget.actions['inbox']) {
                    /* special-case defer because it isn't really a button */
                    if(k == 'defer') {
                        continue;
                    }
                    buttons.push(
                        Nevow.Athena.NodeByAttribute(
                            self.controllerWidget.actions['inbox'][k].button,
                            'class',
                            'button'));

                    self.assertEqual(
                        buttons[buttons.length-1].style.opacity, '');
                }

                var d = Divmod.Defer.Deferred();
                self.controllerWidget.disableActionButtonsUntilFires(d);

                for(var i = 0; i < buttons.length; i++) {
                    self.assertNotEqual(buttons[i].style.opacity, '');
                    self.failUnless(parseFloat(buttons[i].style.opacity) < 1);
                }

                d.callback(buttons);
                return d;
            });
        result.addCallback(
            function(buttons) {
                for(var i = 0; i < buttons.length; i++) {
                    self.assertEqual(parseFloat(buttons[i].style.opacity), 1);
                }
            });
        return result;
    },

    /**
     * Test that the L{getPeople} method returns an Array of objects describing
     * the people names visible.
     */
    function test_getPeople(self) {
        var result = self.setUp();
        result.addCallback(function(ignored) {
                var people = self.controllerWidget.getPeople();
                people.sort(function(a, b) {
                        if (a.name < b.name) {
                            return -1;
                        } else if (a.name == b.name) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                self.assertEqual(people.length, 2);

                self.assertEqual(people[0].name, 'Alice');
                self.assertEqual(people[1].name, 'Bob');

                /*
                 * Check that the keys are actually associated with these
                 * people.
                 */
                var result = self.callRemote('personNamesByKeys',
                                             people[0].key, people[1].key);
                result.addCallback(function(names) {
                        self.assertArraysEqual(names, ['Alice', 'Bob']);
                    });
                return result;

            });
        return result;
    },

    /**
     * Test that the unread counts associated with various views are correct.
     * The specific values used here are based on the initialization the server
     * does.
     */
    function test_unreadCounts(self) {
        return self.setUp().addCallback(function(ignored) {
                /*
                 * This is one instead of two since rendering the page marks
                 * one of the unread messages as read.
                 */
                self.assertEqual(
                    self.controllerWidget.getUnreadCountForView("inbox"), 1);

                self.assertEqual(
                    self.controllerWidget.getUnreadCountForView("spam"), 1);

                /*
                 * Three instead of four for the reason mentioned above.
                 */
                self.assertEqual(
                    self.controllerWidget.getUnreadCountForView("all"), 1);

                self.assertEqual(
                    self.controllerWidget.getUnreadCountForView("sent"), 0);
            });
    },

    /**
     * Test the mutation function for unread counts by view.
     */
    function test_setUnreadCounts(self) {
        return self.setUp().addCallback(function(ignored) {
                self.controllerWidget.setUnreadCountForView("inbox", 7);
                self.assertEquals(self.controllerWidget.getUnreadCountForView("inbox"), 7);
            });
    },

    /**
     * Test that the correct subjects show up in the view.
     */
    function test_subjects(self) {
        var result = self.setUp();
        result.addCallback(function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 2,
                    "Should have been 2 rows in the initial inbox view.");

                self.assertEquals(rows[0]["subject"], "2nd message");
                self.assertEquals(rows[1]["subject"], "1st message");
            });
        return result;
    },

    /**
     * Test that the correct dates show up in the view.
     */
    function test_dates(self) {
        var result = self.setUp();
        result.addCallback(function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 2,
                    "Should have been 2 rows in the initial inbox view.");

                /*
                 * Account for timezone differences.
                 */
                var date = new Date(
                    new Date(1999, 12, 13, 0, 0).valueOf() -
                    new Date().getTimezoneOffset() * 100000).getDate();

                self.assertEquals(rows[0]["date"], "1999-12-" + date);
                self.assertEquals(rows[1]["date"], "4:05 PM");
            });
        return result;
    },

    /**
     * Test that the correct list of people shows up in the chooser.
     */
    function test_people(self) {
        var result = self.setUp();
        result.addCallback(function(ignored) {
                var nodesByClass = function nodesByClass(root, value) {
                    return Divmod.Runtime.theRuntime.nodesByAttribute(
                        root, 'class', value);
                };
                /*
                 * Find the node which lets users select to view messages from
                 * a particular person.
                 */
                var viewSelectionNode = self.controllerWidget.contentTableGrid[0][0];
                var personChooser = nodesByClass(
                    viewSelectionNode, "person-chooser")[0];

                /*
                 * Get the nodes with the names of the people in the chooser.
                 */
                var personChoices = nodesByClass(personChooser, "list-option");

                /*
                 * Get the names out of those nodes.
                 */
                var personNames = [];
                var personNode = null;
                for (var i = 0; i < personChoices.length; ++i) {
                    personNode = nodesByClass(personChoices[i], "opt-name")[0];
                    personNames.push(personNode.firstChild.nodeValue);
                }

                personNames.sort();
                self.assertArraysEqual(personNames, ["Alice", "Bob"]);
            });
        return result;
    },


    /**
     * Test switching to the archive view.
     */
    function test_archiveView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('archive');
            });
        result.addCallback(
            function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 2,
                    "Should have been 2 rows in the archive view.");

                self.assertEqual(rows[0]["subject"], "4th message");
                self.assertEqual(rows[1]["subject"], "3rd message");
            });
        return result;
    },


    /**
     * Test switching to the 'all messages' view.
     */
    function test_allView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('all');
            });
        result.addCallback(
            function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 4,
                    "Should have been 4 rows in the 'all messages' view.");

                self.assertEqual(rows[0]["subject"], "4th message");
                self.assertEqual(rows[1]["subject"], "3rd message");
                self.assertEqual(rows[2]["subject"], "2nd message");
                self.assertEqual(rows[3]["subject"], "1st message");
            });
        return result;
    },


    /**
     * Test switching to the spam view.
     */
    function test_spamView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('spam');
            });
        result.addCallback(
            function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 1,
                    "Should have been 1 row in the spam view.");

                self.assertEqual(rows[0]["subject"], "5th message");
            });
        return result;
    },

    /**
     * Test switching to the sent view.
     */
    function test_sentView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('sent');
            });
        result.addCallback(
            function(ignored) {
                var rows = self.collectRows();

                self.assertEqual(
                    rows.length, 1,
                    "Should have been 1 row in the sent view.");

                self.assertEqual(rows[0]["subject"], "6th message");
            });
        return result;
    },

    /**
     * Test that the sent view has a "to" column instead of a "from" column.
     */
    function test_sentViewToColumn(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                /* Sanity check - sender should be displayed in this view.
                 */
                self.failIf(
                    self.controllerWidget.scrollWidget.skipColumn(
                        "senderDisplay"));
                self.failUnless(
                    self.controllerWidget.scrollWidget.skipColumn(
                        "recipient"));

                return self.controllerWidget.chooseMailView("sent");
            });
        result.addCallback(
            function(ignored) {
                var scrollWidget = self.controllerWidget.scrollWidget;

                self.failUnless(
                    self.controllerWidget.scrollWidget.skipColumn(
                        "senderDisplay"));
                self.failIf(
                    self.controllerWidget.scrollWidget.skipColumn(
                        "recipient"));

                /* Make sure the values are correct.
                 */
                var node = scrollWidget.model.getRowData(0).__node__;
                self.assertNotEqual(
                    node.innerHTML.indexOf('alice@example.com'),
                    -1);
            });
        return result;
    },

    /**
     * Check that we are in the "Messages from Alice" view, based on the
     * subjects of the messages we can see
     */
    function _checkInAliceView(self) {
        var rows = self.collectRows();

        self.assertEquals(
            rows.length, 4, "Should have been 4 rows in Alice view.");

        self.assertEquals(rows[0]["subject"], "4th message");
        self.assertEquals(rows[1]["subject"], "3rd message");
        self.assertEquals(rows[2]["subject"], "2nd message");
        self.assertEquals(rows[3]["subject"], "1st message");
    },

    /**
     * Test switching to a view of messages from a particular person.
     */
    function test_personView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var people = self.controllerWidget.getPeople();

                /*
                 * I know the first one is Alice, but I'll make sure.
                 */
                self.assertEqual(people[0].name, 'Alice');

                /*
                 * Change to the all view, so that we see all messages instead
                 * of just inbox messages.
                 */
                var result = self.controllerWidget.chooseMailView('all');
                result.addCallback(function(ignored) {
                        /*
                         * Next view only messages from Alice.
                         */
                        return self.controllerWidget.choosePerson(people[0].key);
                    });

                /*
                 * Once that is done, assert that only Alice's messages show
                 * up.
                 */
                result.addCallback(function(ignored) {
                        self._checkInAliceView();
                    });
                return result;
            });
        return result;
    },

    /**
     * Test that L{Quotient.Mailbox.Controller.choosePerson} switches into the
     * "All People" view when passed "all" as the person key
     */
    function test_personViewAll(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView("trash");
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget.model.totalRowCount(), 3);

                var people = self.controllerWidget.getPeople();
                self.assertEqual(people[1].name, "Bob");

                return self.controllerWidget.choosePerson(people[1].key);
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget.model.totalRowCount(), 2);
                    return self.controllerWidget.choosePerson("all");
                });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget.model.totalRowCount(), 3);
            });
        return result;
    },

    /**
     * Test switching to a view of messages from a particular person (Alice),
     * using the DOM-based view changing method
     */
    function test_personViewByNode(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('all');
            });
        result.addCallback(
            function(ignored) {
                var personChooser = self.controllerWidget.firstNodeByAttribute(
                                        "class", "person-chooser");
                var aliceNode = Nevow.Athena.FirstNodeByAttribute(
                                    personChooser, "class", "list-option");

                return self.controllerWidget.choosePersonByNode(aliceNode).addCallback(
                    function(ignored) {
                        return aliceNode;
                    });
            });
        result.addCallback(
            function(aliceNode) {
                self.assertEqual(aliceNode.className, "selected-list-option");
                self._checkInAliceView();
            });
        return result;
    },

    /**
     * Test switching to a view of messages with a particular tag.
     */
    function test_tagView(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                /*
                 * Change to the view of messages with the foo tag.
                 */
                return self.controllerWidget.chooseTag('foo');
            });
        /*
         * Once the view is updated, test that only the message tagged "foo" is
         * visible.
         */
        result.addCallback(
            function(ignored) {
                var rows = self.collectRows();

                self.assertEquals(
                    rows.length, 1, "Should have been 1 row in the 'foo' tag view.");

                self.assertEquals(rows[0]["subject"], "1st message");
            });
        return result;
    },

    /**
     * Test that sending a view request starts the throbber throbbing and that
     * when the request has been completed the throbber stops throbbing.
     */
    function test_throbberStates(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                /*
                 * Hook the throbber.
                 */
                self.throbber = Quotient.Test.TestThrobber();
                self.controllerWidget.scrollWidget.throbber = self.throbber;

                var result = self.controllerWidget.chooseMailView('all');

                /*
                 * Throbber should have been started by the view change.
                 */
                self.failUnless(
                    self.throbber.throbbing,
                    "Throbber should have been throbbing after view request.");

                return result;
            });
        result.addCallback(
            function(ignored) {
                /*
                 * View has been changed, the throbber should have been stopped.
                 */
                self.failIf(
                    self.throbber.throbbing,
                    "Throbber should have been stopped after view change.");
            });
        return result;
    },

    /**
     * Test that the first row of the initial view is selected after the widget
     * loads.
     */
    function test_initialSelection(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget._selectedRowID,
                    self.controllerWidget.scrollWidget.model.getRowData(0).__id__,
                    "Expected first row to be selected.");
            });
        return result;
    },

    /**
     * Test that the first row after a view change completes is selected.
     */
    function test_viewChangeSelection(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('all');
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget._selectedRowID,
                    self.controllerWidget.scrollWidget.model.getRowData(0).__id__,
                    "Expected first row to be selected after view change.");
            });
        return result;
    },

    /**
     * Test that the currently selected message can be archived.
     */
    function test_archiveCurrentMessage(self) {
        var model;
        var rowIdentifiers;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                return self.callRemote(
                    "archivedFlagsByWebIDs",
                    rowIdentifiers[0],
                    rowIdentifiers[1]);
            });
        result.addCallback(
            function(flags) {
                self.assertArraysEqual(
                    flags,
                    [true, false]);

                self.assertEqual(
                    model.getRowData(0).__id__, rowIdentifiers[1]);
            });
        return result;
    },

    /**
     * Test that an archive request issued while another is outstanding also
     * completes successfully.
     */
    function test_concurrentArchive(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var firstArchive = self.controllerWidget.archive(null);
                var secondArchive = self.controllerWidget.archive(null);
                return Divmod.Defer.gatherResults([firstArchive, secondArchive]);
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(self.controllerWidget.scrollWidget.model.rowCount(), 0);
                self.assertEqual(self.controllerWidget.scrollWidget.getSelectedRow(), null);
            });
        return result;
    },

    /**
     * Test that the checkbox for a row changes to the checked state when that
     * row is added to the group selection.
     */
    function test_groupSelectRowCheckbox(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var scroller = self.controllerWidget.scrollWidget;
                var row = scroller.model.getRowData(0);
                var webID = row.__id__;
                var checkboxImage = scroller._getCheckbox(row);
                scroller.groupSelectRowAndUpdateCheckbox(
                    webID, checkboxImage);
                /*
                 * The checkbox should be checked now.
                 */
                self.assertNotEqual(
                    checkboxImage.src.indexOf("checkbox-on.gif"), -1,
                    "Checkbox image was not the on image.");
            });
        return result;
    },

    /**
     * Test that the checkbox for a row changes to the unchecked state when
     * that row is removed from the group selection.
     */
    function test_groupUnselectRowCheckbox(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var scroller = self.controllerWidget.scrollWidget;
                var row = scroller.model.getRowData(0);
                var webID = row.__id__;
                var checkboxImage = scroller._getCheckbox(row);

                /*
                 * Select it first, so the next call will unselect it.
                 */
                scroller.groupSelectRow(webID);

                scroller.groupSelectRowAndUpdateCheckbox(
                    webID, checkboxImage);
                /*
                 * The checkbox should be checked now.
                 */
                self.assertNotEqual(
                    checkboxImage.src.indexOf("checkbox-off.gif"), -1,
                    "Checkbox image was not the on image.");
            });
        return result;
    },

    /**
     * Test changing the batch selection to all messages.
     */
    function test_changeBatchSelectionAll(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.controllerWidget.changeBatchSelection("all");

                var scroller = self.controllerWidget.scrollWidget
                var selected = scroller.selectedGroup;

                self.assertEqual(Divmod.dir(selected).length, 2);
                self.assertIn(scroller.model.getRowData(0).__id__, selected);
                self.assertIn(scroller.model.getRowData(1).__id__, selected);
            });
        return result;
    },

    /**
     * Test changing the batch selection to read messages.
     */
    function test_changeBatchSelectionRead(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.controllerWidget.changeBatchSelection("read");

                var scroller = self.controllerWidget.scrollWidget
                var selected = scroller.selectedGroup;

                self.assertEqual(Divmod.dir(selected).length, 1);
                self.assertIn(scroller.model.getRowData(0).__id__, selected);
            });
        return result;
    },

    /**
     * Test changing the batch selection to unread messages.
     */
    function test_changeBatchSelectionUnread(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.controllerWidget.changeBatchSelection("unread");

                var scroller = self.controllerWidget.scrollWidget
                var selected = scroller.selectedGroup;

                self.assertEqual(Divmod.dir(selected).length, 1);
                self.assertIn(scroller.model.getRowData(1).__id__, selected);
            });
        return result;
    },

    function _actionTest(self, viewName, individualActionNames, batchActionNames) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView(viewName);
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Make sure that each individual action's button is displayed,
                 * and any action not explicitly mentioned is hidden.
                 */
                var actions = self.controllerWidget.actions[viewName];
                var allActionNames = Divmod.dir(actions);
                var excludedActionNames = Divmod.dir(actions);

                for (var i = 0; i < individualActionNames.length; ++i) {
                    self.assertEqual(
                        actions[individualActionNames[i]].button.style.display,
                        "");

                    for (var j = 0; j < excludedActionNames.length; ++j) {
                        if (excludedActionNames[j] == individualActionNames[i]) {
                            excludedActionNames.splice(j, 1);
                            break;
                        }
                    }
                }

                /*
                 * All the other actions should be hidden.
                 */
                for (var i = 0; i < excludedActionNames.length; ++i) {
                    self.assertEqual(
                        actions[excludedActionNames[i]].button.style.display,
                        "none",
                        excludedActionNames[i] + " was available in " + viewName + " view.");
                }
            });
        return result;
    },

    /**
     * Test that the correct actions (and batch actions) are available in the inbox view.
     */
    function test_actionsForInbox(self) {
        return self._actionTest(
            "inbox",
            ["archive", "defer", "delete", "forward", "reply", "train-spam"],
            ["archive", "delete", "train-spam"]);
    },

    /**
     * Like L{test_actionsForInbox}, but for the archive view.
     */
    function test_actionsForArchive(self) {
        return self._actionTest(
            'archive',
            ['unarchive', 'delete', 'forward', 'reply', 'train-spam'],
            ['unarchive', 'delete', 'train-spam']);
    },

    /**
     * Like L{test_actionsForInbox}, but for the all view.
     */
    function test_actionsForAll(self) {
        return self._actionTest(
            "all",
            ["unarchive", "defer", "delete", "forward", "reply", "train-spam"],
            ["unarchive", "delete", "train-spam"]);
    },

    /**
     * Like L{test_actionsForInbox}, but for the trash view.
     */
    function test_actionsForTrash(self) {
        return self._actionTest(
            "trash",
            ["undelete", "forward", "reply"],
            ["undelete"]);
    },

    /**
     * Like L{test_actionsForInbox}, but for the spam view.
     */
    function test_actionsForSpam(self) {
        return self._actionTest(
            "spam",
            ["delete", "train-ham"],
            ["delete", "train-ham"]);
    },

    /**
     * Like L{test_actionsForInbox}, but for the deferred view.
     */
    function test_actionsForDeferred(self) {
        return self._actionTest(
            "deferred",
            ["forward", "reply"],
            []);
    },

    /**
     * Like L{test_actionsForInbox}, but for the sent view.
     */
    function test_actionsForSent(self) {
        return self._actionTest(
            "sent",
            ["delete", "forward", "reply"],
            ["delete"]);
    },

    /**
     * Test deleting the currently selected message batch.
     */
    function test_deleteBatch(self) {
        var rowIdentifiers;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                self.controllerWidget.changeBatchSelection("unread");
                return self.controllerWidget.trash(null);
            });
        result.addCallback(
            function(ignored) {
                return self.callRemote(
                    'deletedFlagsByWebIDs',
                    rowIdentifiers[0],
                    rowIdentifiers[1]);
            });
        result.addCallback(
            function(deletedFlags) {
                self.assertArraysEqual(
                    deletedFlags,
                    [false, true]);
            });
        return result;
    },

    /**
     * Test the batch deletion of all messages in the current view.
     */
    function test_deleteAllBatch(self) {
        var model;
        var scroller;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                scroller = self.controllerWidget.scrollWidget;
                model = scroller.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                self.controllerWidget.changeBatchSelection("all");
                return self.controllerWidget.trash(null);
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Model and view should be completely empty at this point.
                 */
                self.assertEqual(model.rowCount(), 0);
                self.assertEqual(scroller._scrollViewport.childNodes.length, 1);
                self.assertEqual(scroller._scrollViewport.childNodes[0].style.height, "0px");

                return self.callRemote(
                    'deletedFlagsByWebIDs',
                    rowIdentifiers[0],
                    rowIdentifiers[1]);
            });
        result.addCallback(
            function(deletedFlags) {
                self.assertArraysEqual(
                    deletedFlags,
                    [true, true]);
            });
        return result;
    },

    /**
     * Test archiving the currently selected message batch.
     */
    function test_archiveBatch(self) {
        var rowIdentifiers;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                self.controllerWidget.changeBatchSelection("unread");
                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                return self.callRemote(
                    'archivedFlagsByWebIDs',
                    rowIdentifiers[0],
                    rowIdentifiers[1]);
            });
        result.addCallback(
            function(deletedFlags) {
                self.assertArraysEqual(
                    deletedFlags,
                    [false, true]);
            });
        return result;
    },

    /**
     * Test archiving a batch which includes the currently selected message.
     * This should change the message selection to the next message in the
     * mailbox.
     */
    function test_archiveBatchIncludingSelection(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.controllerWidget.changeBatchSelection("read");
                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                var model = self.controllerWidget.scrollWidget.model;
                self.assertEqual(
                    model.getRowData(0).__id__,
                    self.controllerWidget.scrollWidget.getSelectedRow().__id__);
            });
        return result;
    },

    /**
     * Test selecting every message in the view and then archiving them.
     */
    function test_archiveAllBySelection(self) {
        var rowNodes;
        var scroller;
        var model;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                scroller = self.controllerWidget.scrollWidget;
                model = scroller.model;

                var rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                rowNodes = [
                    model.getRowData(0).__node__,
                    model.getRowData(1).__node__];

                scroller.groupSelectRow(rowIdentifiers[0]);
                scroller.groupSelectRow(rowIdentifiers[1]);

                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Everything has been archived, make sure there are no rows
                 * left.
                 */
                self.assertEqual(model.rowCount(), 0);

                /*
                 * And none of those rows that don't exist in the model should
                 * be displayed, either.
                 */
                self.assertEqual(rowNodes[0].parentNode, null);
                self.assertEqual(rowNodes[1].parentNode, null);
            });
        return result;
    },

    /**
     * Test archiving the selected group of messages.
     */
    function test_archiveGroupSelection(self) {
        var rowIdentifiers;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                self.controllerWidget.scrollWidget.groupSelectRow(rowIdentifiers[1]);
                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                return self.callRemote(
                    'archivedFlagsByWebIDs',
                    rowIdentifiers[0],
                    rowIdentifiers[1]);
            });
        result.addCallback(
            function(deletedFlags) {
                self.assertArraysEqual(
                    deletedFlags,
                    [false, true]);
            });
        return result;
    },

    /**
     * Check the interaction between archiving a number of checked messages
     * (a 'batch') and then archiving a single message (the 'selected'
     * message).
     *
     * In particular, we do the equivalent of selecting the "foo" tag, hitting
     * "select all", hitting "archive", selecting the "all" special tag, and
     * then hitting "archive". We then check that there are no messages left
     * in the inbox display. This means that the selected message was archived.
     *
     * Derived from ticket #1780
     */
    function test_archiveBatchThenArchiveSelected(self) {
        var d = self.setUp();
        var model;
        // select the 'foo' tag.
        d.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseTag('foo');
            });
        // select all messages in the 'foo' tag (there should be just one).
        d.addCallback(
            function(ignored) {
                self.assertEqual(model.totalRowCount(), 1);
                self.controllerWidget.changeBatchSelection("all");
                return self.controllerWidget.archive(null);
            });
        // display all messages regardless of tag.
        d.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseTag('all');
            });
        // there should be one message displayed. archive it.
        d.addCallback(
            function(ignored) {
                self.assertEqual(model.totalRowCount(), 1);
                return self.controllerWidget.archive(null);
            });
        // there should be no more messages in this view.
        d.addCallback(
            function(ignored) {
                // totalRowCount is *cached*, so we need to fetch the *real*
                // value from the *widget*. guh. -- jml
                var d = self.controllerWidget.scrollWidget.getSize();
                d.addCallback(function(size) { self.assertEqual(size, 0); });
                return d
            });
        return d;
    },


    /**
     * Test archiving the selected group of messages, including the currently
     * selected message.
     */
    function test_archiveGroupSelectionIncludingSelection(self) {
        var model;
        var rowIdentifiers;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                self.controllerWidget.scrollWidget.groupSelectRow(rowIdentifiers[0]);
                return self.controllerWidget.archive(null);
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    model.getRowData(0).__id__,
                    self.controllerWidget.scrollWidget.getSelectedRow().__id__);
                self.assertEqual(
                    model.getRowData(0).__id__,
                    rowIdentifiers[1]);
            });
        return result;
    },

    /**
     * Test the spam filter can be trained on a particular message.
     */
    function test_trainSpam(self) {
        var model;
        var rowIdentifiers;

        var result = self.setUp();
        result.addCallback(
            function(ignored) {

                model = self.controllerWidget.scrollWidget.model;
                // Let's sanity check before we assert in the next method...
                self.assertEqual(model.rowCount(), 2);

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__
                    ];

                return self.controllerWidget._trainSpam();
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Should have removed message from the current view, since it
                 * is not the spam view.
                 */
                self.assertEqual(model.rowCount(), 1);
                self.assertEqual(model.getRowData(0).__id__, rowIdentifiers[1]);

                /*
                 * Make sure the server thinks the message was trained as spam.
                 */
                return self.callRemote(
                    "trainedStateByWebIDs",
                    rowIdentifiers[0], rowIdentifiers[1]);
            });
        result.addCallback(
            function(trainedStates) {
                /*
                 * This one was trained as spam.
                 */
                self.assertEqual(trainedStates[0].trained, true);
                self.assertEqual(trainedStates[0].spam, true);

                /*
                 * This one was not.
                 */
                self.assertEqual(trainedStates[1].trained, false);
            });
        return result;
    },


    /**
     * Like L{test_trainSpam}, only for training a message as ham rather than
     * spam.
     */
    function test_trainHam(self) {
        var model;
        var rowIdentifiers;

        var result = self.setUp();
        result.addCallback(
            function(ignored) {

                /*
                 * Change to the spam view so training as ham will remove the
                 * message from the view.
                 */

                return self.controllerWidget.chooseMailView("spam");
            });
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [model.getRowData(0).__id__];

                return self.controllerWidget._trainHam();
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Should have removed message from the current view.
                 */
                self.assertEqual(model.rowCount(), 0);

                /*
                 * Make sure the server thinks the message was trained as spam.
                 */
                return self.callRemote(
                    "trainedStateByWebIDs", rowIdentifiers[0]);
            });
        result.addCallback(
            function(trainedStates) {
                /*
                 * It was trained as ham.
                 */
                self.assertEqual(trainedStates[0].trained, true);
                self.assertEqual(trainedStates[0].spam, false);
            });
        return result;
    },


    /**
     * Test that the utility method L{_getDeferralPeriod} returns the correct
     * values from the form in the document.
     */
    function test_getDeferralPeriod(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var period;
                var form = self.controllerWidget.deferForm;
                var days = form.days;
                var hours = form.hours;
                var minutes = form.minutes;

                days.value = hours.value = minutes.value = 1;
                period = self.controllerWidget._getDeferralPeriod();
                self.assertEqual(period.days, 1);
                self.assertEqual(period.hours, 1);
                self.assertEqual(period.minutes, 1);

                days.value = 2;
                period = self.controllerWidget._getDeferralPeriod();
                self.assertEqual(period.days, 2);
                self.assertEqual(period.hours, 1);
                self.assertEqual(period.minutes, 1);

                hours.value = 3;
                period = self.controllerWidget._getDeferralPeriod();
                self.assertEqual(period.days, 2);
                self.assertEqual(period.hours, 3);
                self.assertEqual(period.minutes, 1);

                minutes.value = 4;
                period = self.controllerWidget._getDeferralPeriod();
                self.assertEqual(period.days, 2);
                self.assertEqual(period.hours, 3);
                self.assertEqual(period.minutes, 4);
            });
        return result;
    },

    /**
     * Like L{test_getDeferralPeriod}, but for the utility method
     * L{_deferralStringToPeriod} and L{_getDeferralSelection} (Sorry for
     * putting these together, I think this is a really icky test and I didn't
     * want to type out all this boilerplate twice -exarkun).
     */
    function test_deferralStringtoPeriod(self) {
        var result = self.setUp(self);
        result.addCallback(
            function(ignored) {
                var period;
                var node = self.controllerWidget.deferSelect;

                var deferralPeriods = {
                    "one-day": {
                        "days": 1,
                        "hours": 0,
                        "minutes": 0},
                    "one-hour": {
                        "days": 0,
                        "hours": 1,
                        "minutes": 0},
                    "twelve-hours": {
                        "days": 0,
                        "hours": 12,
                        "minutes": 0},
                    "one-week": {
                        "days": 7,
                        "hours": 0,
                        "minutes": 0}
                };

                var option;
                var allOptions = node.getElementsByTagName("option");
                for (var cls in deferralPeriods) {
                    option = Divmod.Runtime.theRuntime.firstNodeByAttribute(node, "class", cls);
                    period = self.controllerWidget._deferralStringToPeriod(option.value);
                    self.assertEqual(period.days, deferralPeriods[cls].days);
                    self.assertEqual(period.hours, deferralPeriods[cls].hours);
                    self.assertEqual(period.minutes, deferralPeriods[cls].minutes);

                    for (var i = 0; i < allOptions.length; ++i) {
                        if (allOptions[i] === option) {
                            node.selectedIndex = i;
                            break;
                        }
                    }
                    if (i == allOptions.length) {
                        self.fail("Could not find option node to update selection index.");
                    }
                    period = self.controllerWidget._getDeferralSelection();
                    self.assertEqual(period.days, deferralPeriods[cls].days);
                    self.assertEqual(period.hours, deferralPeriods[cls].hours);
                    self.assertEqual(period.minutes, deferralPeriods[cls].minutes);
                }
            });
        return result;
    },

    /**
     * Test the message deferral functionality.
     */
    function test_defer(self) {
        var model;
        var rowIdentifiers;

        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;

                rowIdentifiers = [
                    model.getRowData(0).__id__,
                    model.getRowData(1).__id__];

                return self.controllerWidget.formDefer();
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(model.rowCount(), 1);

                self.assertEqual(model.getRowData(0).__id__, rowIdentifiers[1]);

                return self.callRemote(
                    "deferredStateByWebIDs",
                    rowIdentifiers[0], rowIdentifiers[1]);
            });
        result.addCallback(
            function(deferredStates) {
                /*
                 * First message should have an undeferral time that is at
                 * least 30 minutes after the current time, since the minimum
                 * deferral time is 1 hour. (XXX This is garbage - we need to
                 * be able to test exact values here).
                 */
                self.assertNotEqual(deferredStates[0], null);
                self.failUnless(
                    deferredStates[0] - (30 * 60) > new Date().getTime() / 1000);
                /*
                 * Second message wasn't deferred
                 */
                self.assertEqual(deferredStates[1], null);
            });
        return result;
    },

    /**
     * Test that selecting the reply-to action for a message brings up a
     * compose widget.
     */
    function test_replyTo(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.replyTo(false);
            });
        result.addCallback(self._makeComposeTester());
        return result;
    },

    /**
     * Test that selecting the forward action for a message brings up a
     * compose widget.
     */
    function test_forward(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.forward(false);
            });
        result.addCallback(self._makeComposeTester());
        return result;
    },

    /**
     * Test that selecting the "reply all" action for a message brings up a
     * compose widget.
     */
    function test_replyToAll(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.replyToAll(false);
            });
        result.addCallback(self._makeComposeTester());
    },

    /**
     * Test that selecting the redirect action for a message brings up a
     * compose widget
     */
    function test_redirect(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.redirect(false);
            });
        result.addCallback(
            function(ignored) {
                var children = self.controllerWidget.childWidgets;
                var lastChild = children[children.length - 1];
                self.failUnless(lastChild instanceof Quotient.Compose.RedirectingController);

                var parentNode = lastChild.node;
                while(parentNode != null && parentNode != self.node) {
                    parentNode = parentNode.parentNode;
                }
                self.assertEqual(parentNode, self.node);
            });
        return result;
    },

    /**
     * Test that the send button on the compose widget returns the view to its
     * previous state.
     */
    function test_send(self) {
        var composer;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.replyTo(false);
            });
        result.addCallback(
            function(ignored) {
                var children = self.controllerWidget.childWidgets;
                composer = children[children.length - 1];
                /*
                 * Sanity check.
                 */
                self.failUnless(composer instanceof Quotient.Compose.Controller);

                composer.stopSavingDrafts();

                return composer.submit();
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Composer should no longer be displayed.
                 */
                self.assertEqual(composer.node.parentNode, null);

                return composer.callRemote('getInvokeArguments');
            });
        result.addCallback(
            function(invokeArguments) {
                /*
                 * Should have been called once.
                 */
                self.assertEqual(invokeArguments.length, 1);

                self.assertArraysEqual(invokeArguments[0].toAddresses, ['alice@example.com']);
                self.assertArraysEqual(invokeArguments[0].cc, ['bob@example.com']);
                self.assertArraysEqual(invokeArguments[0].bcc, ['']);
                self.assertArraysEqual(invokeArguments[0].subject, ['Test Message']);
                self.assertArraysEqual(invokeArguments[0].draft, [false]);
                self.assertArraysEqual(invokeArguments[0].messageBody, ['message body text']);
            });
        return result;
    },

    /**
     * Test that a message in the trash can be undeleted.
     */
    function test_undelete(self) {
        var model;
        var rowIdentifier;

        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseMailView("trash");
            });
        result.addCallback(
            function(ignored) {
                rowIdentifier = model.getRowData(0).__id__;
                return self.controllerWidget.untrash(null);
            });
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView("all");
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Undeleted message should be here _somewhere_.
                 */
                var row = model.findRowData(rowIdentifier);
            });
        return result;
    },

    /**
     * Test that a message in the archive can be unarchived.
     */
    function test_unarchive(self) {
        var model;
        var rowIdentifier;

        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseMailView("all");
            });
        result.addCallback(
            function(ignored) {
                rowIdentifier = model.getRowData(0).__id__;
                return self.controllerWidget.unarchive(null);
            });
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView("inbox");
            });
        result.addCallback(
            function(ignored) {
                /*
                 * Undeleted message should be here _somewhere_.
                 */
                var row = model.findRowData(rowIdentifier);
            });
        return result;
    },


    /**
     * Test that a message disappears when it is unarchived from the archive
     * view.
     */
    function test_unarchiveRemovesFromArchive(self) {
        var d = self.setUp();
        var model, rowIdentifier;
        d.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseMailView('archive');
            });
        d.addCallback(
            function(ignored) {
                rowIdentifier = model.getRowData(0).__id__;
                return self.controllerWidget.unarchive(null);
            });
        d.addCallback(
            function(ignored) {
                self.assertThrows(Mantissa.ScrollTable.NoSuchWebID,
                                  function () {
                                      model.findIndex(rowIdentifier);
                                  });
            });
        return d;
    },


    /**
     * Test that a message in "All" view remains in "All" when it is
     * unarchived.
     */
    function test_unarchiveKeepsInAll(self) {
        var d = self.setUp();
        var model, rowIdentifier;
        d.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseMailView('all');
            });
        d.addCallback(
            function(ignored) {
                rowIdentifier = model.getRowData(0).__id__;
                return self.controllerWidget.unarchive(null);
            });
        d.addCallback(
            function(ignored) {
                self.assertEqual(rowIdentifier, model.getRowData(0).__id__);
            });
        return d;
    },


    /**
     * Test that archiving a message from the Archive view does not change
     * the display.
     */
    function test_archiveFromArchiveIdempotent(self) {
        var d = self.setUp();
        var model, rowIdentifier;
        d.addCallback(
            function(ignored) {
                model = self.controllerWidget.scrollWidget.model;
                return self.controllerWidget.chooseMailView('archive');
            });
        d.addCallback(
            function(ignored) {
                rowIdentifier = model.getRowData(0).__id__;
                return self.controllerWidget.archive(null);
            });
        d.addCallback(
            function(ignored) {
                // check that the "archived" row is unchanged.
                self.assertEqual(rowIdentifier,
                                 model.getRowData(0).__id__);
            });
        return d;
    },


    /**
     * Test that the (undisplayed) Message.sender column is passed to the
     * scrolltable model
     */
    function test_senderColumn(self) {
        var model = self.controllerWidget.scrollWidget.model;
        self.failUnless(model.getRowData(0).sender);
    },

    /**
     * Test that changing the view from the view shortcut selector
     * changes the view and selects the corresponding list-item in
     * the main view selector.  Also test the inverse.
     */
    function test_viewShortcut(self) {
        var select = self.controllerWidget.viewShortcutSelect;
        var options = select.getElementsByTagName("option");
        var changeView = function(name) {
            for(var i = 0; i < options.length; i++) {
                if(options[i].value == name) {
                    select.selectedIndex = i;
                    return;
                }
            }
        }
        changeView("all");
        var D = self.controllerWidget.chooseMailViewByShortcutNode(select);
        return D.addCallback(
            function() {
                var viewSelectorNode = self.controllerWidget.mailViewNodes["all"];
                self.assertEqual(
                    viewSelectorNode.parentNode.className,
                    "selected-list-option");

                return self.controllerWidget.chooseMailViewByNode(
                            self.controllerWidget.mailViewNodes["inbox"].parentNode);
        }).addCallback(
            function() {
                self.assertEqual(select.value, "inbox");
        });
    },


    /**
     * Test that the private helper method _findPreviewRow returns the correct
     * row data.
     */
    function test_findPreviewRow(self) {
        var controller;
        var model;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                controller = self.controllerWidget;
                model = controller.scrollWidget.model;
                self.assertEqual(
                    controller._findPreviewRow(model.getRowData(0).__id__).__id__,
                    model.getRowData(1).__id__);
                self.assertEqual(
                    controller._findPreviewRow(model.getRowData(1).__id__).__id__,
                    model.getRowData(0).__id__);

                /*
                 * Switch to a view with only one message to test that case.
                 */
                return controller.chooseMailView('spam');
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    controller._findPreviewRow(model.getRowData(0).__id__),
                    null);
            });
        return result;
    },


    /**
     * Test that all of the correct information for a preview is extracted from
     * a data row by the private helper method _getPreviewData.
     */
    function test_getPreviewData(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var rowData = self.controllerWidget.scrollWidget.model.getRowData(0);
                var preview = self.controllerWidget._getPreviewData(rowData);
                self.assertArraysEqual(Divmod.dir(preview), ["subject"]);
                self.assertEqual(preview.subject, "2nd message");
            });
        return result;
    },

    /**
     * Test that values passed to setMessageContent show up in the display.
     */
    function test_setMessageContent(self) {
        var webID;
        var controller;
        var model;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                controller = self.controllerWidget;
                model = controller.scrollWidget.model;
                webID = model.getRowData(0).__id__;
                return self.callRemote('getMessageDetail', webID);
            });
        result.addCallback(
            function(messageDetailInfo) {
                var subject = model.getRowData(1).subject;
                controller.setMessageContent(webID, messageDetailInfo);
                self.assertNotEqual(controller.node.innerHTML.indexOf(subject), -1);

            });
        return result;
    },

    /**
     * Test that the subject of the message preview passed to setMessageContent
     * is properly escaped if necessary.
     */
    function test_setPreviewQuoting(self) {
        var webID;
        var controller;
        var model;
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                controller = self.controllerWidget;
                model = controller.scrollWidget.model;
                webID = model.getRowData(0).__id__;
                return self.callRemote('getMessageDetail', webID);
            });
        result.addCallback(
            function(messageDetailInfo) {
                var subject = 'test <subject> & string';
                var escaped = 'test &lt;subject&gt; &amp; string';

                /*
                 * Cheat a little bit.  Jam the subject we're testing into the
                 * model so it'll get used to populate the view.
                 */
                model.getRowData(1).subject = subject;

                controller.setMessageContent(webID, messageDetailInfo);
                self.assertNotEqual(controller.node.innerHTML.indexOf(escaped), -1);

            });
        return result;
    },

    /**
     * @return: a function which can be added as a callback to a deferred
     * which fires with an L{Quotient.Compose.Controller} instance.  Checks
     * the the compose instance is inside the message detail of our
     * L{Quotient.Mailbox.Controller}, and has the "inline" attribute set
     */
    function _makeComposeTester(self) {
        return function(composer) {
            var children = self.controllerWidget.childWidgets;
            var lastChild = children[children.length - 1];
            self.failUnless(lastChild instanceof Quotient.Compose.Controller);

            /*
                * XXX Stop it from saving drafts, as this most likely won't
                * work and potentially corrupts page state in ways which will
                * break subsequent tests.
                */
            lastChild.stopSavingDrafts();

            /*
                * Make sure it's actually part of the page
                */
            var parentNode = lastChild.node;
            while (parentNode != null && parentNode != self.node) {
                parentNode = parentNode.parentNode;
            }
            self.assertEqual(parentNode, self.node);
            self.failUnless(lastChild.inline);
            return lastChild;
        }
    },

    /**
     * Test L{Quotient.Mailbox.Controller.splatComposeWidget} when not passed
     * composeInfo or reloadMessage.
     */
    function test_splatCompose(self) {
        var result = self.setUp();
        result.addCallback(
            function() {
                return self.controllerWidget.splatComposeWidget();
            });
        result.addCallback(self._makeComposeTester());
        return result;
    },

    /**
     * Test L{Quotient.Mailbox.Controller.splatComposeWidget} when passed a
     * composeInfo argument
     */
    function test_splatComposeComposeInfo(self) {
        var result = self.setUp();
        result.addCallback(
            function() {
                return self.controllerWidget.callRemote("getComposer");
            });
        result.addCallback(
            function(composeInfo) {
                return self.controllerWidget.splatComposeWidget(composeInfo);
            });
        result.addCallback(self._makeComposeTester());
    },

    /**
     * Test L{Quotient.Mailbox.Controller.reloadMessageAfterComposeCompleted}
     */
    function test_reloadMessageAfterComposeCompleted(self) {
        var cancelled = false;

        var result = self.setUp();
        result.addCallback(
            function() {
                return self.controllerWidget.splatComposeWidget();
            });
        result.addCallback(
            function(composer) {
                var controller = self.controllerWidget;
                var curmsg = controller.scrollWidget.getSelectedRow();
                var reload = controller.reloadMessageAfterComposeCompleted(composer);

                setTimeout(
                    function() {
                        composer.cancel();
                        cancelled = true;
                    }, 1000);

                return reload.addCallback(
                    function() {
                        return curmsg;
                    });
            });
        result.addCallback(
            function(curmsg) {
                self.failUnless(cancelled);

                /* check that the compose widget has been replaced with a
                 * message detail, and that the current message in the
                 * scrolltable is still curmsg */

                Nevow.Athena.Widget.get(
                    Nevow.Athena.FirstNodeByAttribute(
                        self.controllerWidget.messageDetail,
                        "athena:class",
                        "Quotient.Message.MessageDetail"));

                self.assertEqual(
                    self.controllerWidget.scrollWidget.getSelectedRow().__id__,
                    curmsg.__id__);
            });
        return result;
    },

    /**
     * Tests for L{Quotient.Mailbox.Controller.methodCallFromSelect}
     */
    function test_methodCallFromSelect(self) {
        var result = self.setUp();
        result.addCallback(
            function() {
                var called = 0;
                self.controllerWidget.__counterMethod = function() {
                    called++;
                    return "HI!";
                }

                var select = document.createElement("select");
                var option = document.createElement("option");
                option.value = "__counterMethod";
                select.appendChild(option);

                self.assertEqual(
                    self.controllerWidget.methodCallFromSelect(select),
                    "HI!");
                self.assertEqual(called, 1);

                option.removeAttribute("value");

                self.assertEqual(
                    self.controllerWidget.methodCallFromSelect(select),
                    null);
                self.assertEqual(called, 1);
            });
        return result;
    });



/**
 * Test controller behaviors in the presence of a more than a complete visible
 * page of messages.
 */
Quotient.Test.FullControllerTestCase = Nevow.Athena.Test.TestCase.subclass(
    'Quotient.Test.FullControllerTestCase');
Quotient.Test.FullControllerTestCase.methods(
    /* Retrieve a fully controller widget from the server, add it to the
     * document and return its initialization deferred
     *
     * @type: L{Divmod.Defer.Deferred}
     */
    function setUp(self) {
        var result = self.callRemote('getFullControllerWidget');
        result.addCallback(function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(
            function(widget) {
                self.controller = widget;
                self.node.appendChild(widget.node);
                return widget.initializationDeferred;
            });
        return result;
    },


    /**
     * Check the interaction between archiving a number of checked messages
     * (a 'batch') and then archiving a single message (the 'selected'
     * message).
     *
     * This test functions much like
     * L{ControllerTestCase.test_archiveBatchThenArchiveSelected}, except it
     * ensures that the messages that are off-screen are *not* archived. This
     * is the negative behaviour outlined in ticket #1780.
     */
    function test_archiveAllTaggedThenArchiveSelected(self) {
        var d = self.setUp();
        d.addCallback(
            function(ignored) {
                return self.controller.chooseTag('foo');
            });
        d.addCallback(
            function(ignored) {
                self.controller.changeBatchSelection('all');
                return self.controller.archive(null);
            });
        d.addCallback(
            function(ignored) {
                return self.controller.chooseTag('all');
            });
        d.addCallback(
            function(ignored) {
                return self.controller.archive(null);
            });
        d.addCallback(
            function(ignored) {
                var d = self.controller.scrollWidget.getSize();
                // 20 messages originally, 2 archived -- 1 tagged 'foo', and 1
                // selected.
                d.addCallback(function(size) { self.assertEqual(size, 18); });
                return d;
            });
        return d;
    },


    /**
     * Test deletion of all messages using batch selection.
     */
    function test_deleteAllBatch(self) {
        var result = self.setUp();

        result.addCallback(
            function(ignored) {
                /*
                 * Sanity check - make sure there are fewer rows in the model
                 * than the server knows about.
                 */
                self.failIf(self.controller.scrollWidget.model.rowCount() >= 20);

                /*
                 * Batch select everything and delete it.
                 */
                self.controller.changeBatchSelection("all");
                return self.controller.trash(null);
            });
        result.addCallback(
            function(ignored) {
                var scroller = self.controller.scrollWidget;
                self.assertEqual(
                    scroller.model.rowCount(),
                    0,
                    "Too many rows in model.");
                self.assertEqual(
                    scroller.placeholderModel.getPlaceholderCount(),
                    1,
                    "Too many placeholders in model.");

                /*
                 * The existence of this placeholder is not strictly necessary.
                 * However, it exists with the current implementation, and I
                 * really want to assert something about placeholders, so I am
                 * going to assert that it covers an empty range.  If the
                 * placeholder implementation changes at some future point,
                 * then perhaps these asserts should be changed as well.
                 */
                var placeholder = scroller.placeholderModel.getPlaceholderWithIndex(0);
                self.assertEqual(placeholder.start, 0);
                self.assertEqual(placeholder.stop, 0);

                /*
                 * Fucked up.  Asserting against a string to determine the
                 * height of something?  Garbage.  Asserting against a style to
                 * make sure that there's nothing visible?  Equally fucked up.
                 */
                self.assertEqual(
                    scroller._scrollViewport.childNodes.length,
                    1,
                    "Too many rows in view.");
                self.assertEqual(
                    scroller._scrollViewport.childNodes[0].style.height,
                    "0px",
                    "View too tall.");
            });
        return result;
    },

    /**
     * Test group actions when the rows have been fetched out of order
     */
    function test_groupActionsOutOfOrderRows(self) {
        var result = self.setUp();

        result.addCallback(
            function(ignored) {
                /* get a row near the end */
                return self.controller.scrollWidget.requestRowRange(18, 19);
            });

        result.addCallback(
            function(ignored) {
                /* get some row before it */
                return self.controller.scrollWidget.requestRowRange(15, 16);
            });

        result.addCallback(
            function(ignored) {
                /* add the last row to the group selection */
                var webID = self.controller.scrollWidget.model.getRowData(18).__id__;
                self.controller.scrollWidget.groupSelectRow(webID);
                /* and archive it */
                result = self.controller.archive();
                return result.addCallback(
                    function(ignored) {
                        return webID;
                    });
            });

        result.addCallback(
            function(webID) {
                /* if we got here, we're good, but lets test some junk anyway */
                self.failIf(self.controller.scrollWidget.selectedGroup);
                self.assertThrows(
                    Mantissa.ScrollTable.NoSuchWebID,
                    function() {
                        self.controller.scrollWidget.model.findIndex(webID);
                    });
            });
        return result;
    });


Quotient.Test.EmptyInitialViewControllerTestCase = Nevow.Athena.Test.TestCase.subclass(
    'Quotient.Test.EmptyInitialViewControllerTestCase');
Quotient.Test.EmptyInitialViewControllerTestCase.methods(
    /**
     * Retrieve a Controller Widget for an inbox from the server.
     */
    function setUp(self) {
        var result = self.callRemote('getControllerWidget');
        result.addCallback(
            function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(function(widget) {
                self.controllerWidget = widget;
                self.node.appendChild(widget.node);
                return self.controllerWidget.scrollWidget.initializationDeferred;
            });
        result.addCallback(function(widget) {
                return self.controllerWidget.chooseMailView('all');
            });
        return result;
    },

    /**
     * Test that the forward action works in this configuration.
     */
    function test_forward(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.forward(false);
            });
        result.addCallback(
            function(ignored) {
                var children = self.controllerWidget.childWidgets;
                var lastChild = children[children.length - 1];
                self.failUnless(lastChild instanceof Quotient.Compose.Controller);

                /*
                 * XXX Stop it from saving drafts, as this most likely won't
                 * work and potentially corrupts page state in ways which will
                 * break subsequent tests.
                 */
                lastChild.stopSavingDrafts();

                /*
                 * Make sure it's actually part of the page
                 */
                var parentNode = lastChild.node;
                while (parentNode != null && parentNode != self.node) {
                    parentNode = parentNode.parentNode;
                }
                self.assertEqual(parentNode, self.node);
            });
        return result;
    });



Quotient.Test.EmptyControllerTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.EmptyControllerTestCase');
Quotient.Test.EmptyControllerTestCase.methods(
    /**
     * Get an empty Controller widget and add it as a child to this test case's
     * node.
     */
    function setUp(self) {
        var result = self.callRemote('getEmptyControllerWidget');
        result.addCallback(
            function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(function(widget) {
                self.controllerWidget = widget;
                self.node.appendChild(widget.node);
                return widget.initializationDeferred;
            });
        return result;
    },

    /**
     * Test that loading an empty mailbox doesn't result in any errors, that no
     * message is initially selected, etc.
     */
    function test_emptyLoad(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget._selectedRowID,
                    null,
                    "No rows exist, so none should have been selected.");
            });
        return result;
    },

    /**
     * Test that switching to an empty view doesn't result in any errors, that
     * no message is initially selected, etc.
     */
    function test_emptySwitch(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                return self.controllerWidget.chooseMailView('all');
            });
        result.addCallback(
            function(ignored) {
                self.assertEqual(
                    self.controllerWidget.scrollWidget._selectedRowID,
                    null,
                    "No rows exist, so none should have been selected.");
            });
        return result;
    },

    /**
     * Test that loading an empty mailbox displays 'No more messages' in
     * the next message preview bar. Check the same after switching to
     * an empty view.
     */
    function test_messagePreview(self) {
        var d = self.setUp();
        d.addCallback(
            function(ignored) {
                var node = self.controllerWidget.nextMessagePreview;
                self.assertEqual(MochiKit.DOM.scrapeText(node),
                                 'No more messages.');
            });
        return d;
    });

/**
 * Tests for Quotient.Compose.FromAddressScrollTable
 */
Quotient.Test.FromAddressScrollTableTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.FromAddressScrollTableTestCase');
Quotient.Test.FromAddressScrollTableTestCase.methods(
    /**
     * Retreive a L{Quotient.Compose.FromAddressScrollTable} from the server
     */
    function setUp(self)  {
        var result = self.callRemote("getFromAddressScrollTable");
        result.addCallback(
            function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(
            function(widget) {
                self.scrollTable = widget;
                self.node.appendChild(widget.node);
                return widget.initializationDeferred;
            });
        return result;
    },

    /**
     * @return: the scrolltable action with name C{name}
     * @rtype: L{Mantissa.ScrollTable.Action}
     */
    function getAction(self, name) {
        for(var i = 0; i < self.scrollTable.actions.length; i++){
            if(self.scrollTable.actions[i].name == name) {
                return self.scrollTable.actions[i];
            }
        }
        throw new Error("no action with name " + name);
    },

    /**
     * Test that the model contains the right stuff for the two FromAddress
     * items in the database
     */
    function test_model(self) {
        return self.setUp().addCallback(
            function() {
                self.assertEqual(self.scrollTable.model.rowCount(), 2);

                var first = self.scrollTable.model.getRowData(0);
                var second = self.scrollTable.model.getRowData(1);

                self.failUnless(first._default);
                self.failIf(second._default);
        });
    },

    /**
     * Test that the custom columnAliases and actions definitions are both
     * respected.
     */
    function test_userInterfaceCustomization(self) {
        return self.setUp().addCallback(
            function(ignored) {
                /*
                 * This is pretty whitebox.
                 */
                self.assertNotEqual(
                    self.scrollTable._headerRow.innerHTML.indexOf('SMTP Host'),
                    -1);

                var i;
                for (i = 0; i < self.scrollTable.columnNames.length; ++i) {
                    if (self.scrollTable.columnNames[i] == "actions") {
                        break;
                    }
                }
                if (i == self.scrollTable.columnNames.length) {
                    self.fail("Did not find actions in columnNames.");
                }
            });
    },

    /**
     * Test that the setDefaultAddress action works
     */
    function test_setDefaultAddress(self) {
        return self.setUp().addCallback(
            function() {
                var second = self.scrollTable.model.getRowData(1);
                var action = self.getAction("setDefaultAddress");
                return action.enact(self.scrollTable, second).addCallback(
                    function() {
                        second = self.scrollTable.model.getRowData(1)
                        var first = self.scrollTable.model.getRowData(0);

                        self.failUnless(second._default);
                        self.failIf(first._default);
                    })
            });
    },

    /**
     * Test that the delete & set default actions are disabled for the system
     * address, which is also the default
     */
    function test_actionsDisabled(self) {
        return self.setUp().addCallback(
            function() {
                var systemAddr = self.scrollTable.model.getRowData(0);
                self.failUnless(systemAddr._default);
                self.assertEqual(systemAddr.__id__, self.scrollTable.systemAddrWebID);

                var actions = self.scrollTable.getActionsForRow(systemAddr);
                self.assertEqual(actions.length, 0);

                var otherAddr = self.scrollTable.model.getRowData(1);
                actions = self.scrollTable.getActionsForRow(otherAddr);
                self.assertEqual(actions.length, 2);
            });
    },

    /**
     * Test the delete action
     */
    function test_deleteAction(self) {
        return self.setUp().addCallback(
            function() {
                var row = self.scrollTable.model.getRowData(1);
                var action = self.getAction("delete");
                return action.enact(self.scrollTable, row).addCallback(
                    function() {
                        self.assertEqual(self.scrollTable.model.rowCount(), 1);
                    });
            });
    });

Quotient.Test.ComposeController = Quotient.Compose.Controller.subclass('ComposeController');
Quotient.Test.ComposeController.methods(
    function saveDraft(self, userInitiated) {
        return Divmod.Defer.succeed(null);
    },

    function startSavingDrafts(self) {
        return;
    },

    function submitSuccess(self, passthrough) {
        return passthrough;
    });

Quotient.Test.ComposeTestCase = Nevow.Athena.Test.TestCase.subclass('ComposeTestCase');
Quotient.Test.ComposeTestCase.methods(
    /**
     * Get a L{Quotient.Test.ComposeController} instance
     */
    function getController(self) {
        return Quotient.Test.ComposeController.get(
                    Nevow.Athena.NodeByAttribute(
                        self.node.parentNode,
                        "athena:class",
                        "Quotient.Test.ComposeController"));
    },

    /**
     * Test the name completion method
     * L{Quotient.Compose.EmailAddressAutoCompleteModel.complete} (when called
     * via L{Quotient.Compose.Controller}) generates the correct address lists
     * for various inputs
     */
    function test_addressCompletion(self) {
        /* get the ComposeController */
        var controller = self.getController();

        /* these are the pairs of [displayName, emailAddress] that we expect
         * the controller to have received from getPeople() */

        var moe     = ["Moe Aboulkheir", "maboulkheir@divmod.com"];
        var tobias  = ["Tobias Knight", "localpart@domain"];
        var madonna = ["Madonna", "madonna@divmod.com"];
        var kilroy  = ["", "kilroy@foo"];

        /**
         * For an emailAddress C{addr} (or part of one), assert that the list of
         * possible completions returned by ComposeController.completeCurrentAddr()
         * matches exactly the list of lists C{completions}, where each element
         * is a pair containing [displayName, emailAddress]
         */
        var assertCompletionsAre = function(addr, completions) {
            var _completions = controller.autoCompleteController.model.complete(addr);
            self.assertArraysEqual(_completions, completions,
                                   function(a, b) {
                                        self.assertArraysEqual(a, b);
                                    });
        }

        /* map email address prefixes to lists of expected completions */
        var completionResults = {
            "m": [moe, madonna],
            "a": [moe],
            "ma": [moe, madonna],
            "maboulkheir@divmod.com": [moe],
            "Moe Aboulkheir": [moe],
            "AB": [moe],
            "k": [tobias, kilroy],
            "KnigHT": [tobias],
            "T": [tobias],
            "l": [tobias],
            "localpart@": [tobias]
        };

        /* check they match up */
        for(var k in completionResults) {
            assertCompletionsAre(k, completionResults[k]);
        }
    },

    /**
     * Test that
     * L{Quotient.Compose.EmailAddressAutoCompleteView._reconstituteAddress}
     * (when called via L{Quotient.Compose.Controller}) does the right thing.
     */
    function test_reconstituteAddresses(self) {
        var controller = self.getController();

        /* map each [displayName, emailAddress] pair to the result we expect
         * from ComposeController.reconstituteAddress(), when passed the pair */
        var reconstitutedAddresses = [
            [["Moe Aboulkheir", "maboulkheir@divmod.com"],
             '"Moe Aboulkheir" <maboulkheir@divmod.com>'],
            [["Tobias Knight", "localpart@domain"],
             '"Tobias Knight" <localpart@domain>'],
            [["Madonna", "madonna@divmod.com"],
             '"Madonna" <madonna@divmod.com>'],
            [["", "kilroy@foo"], '<kilroy@foo>']
        ];

        var view = controller.autoCompleteController.view;

        /* check they match up */
        for(var i = 0; i < reconstitutedAddresses.length; i++) {
            self.assertEquals(
                view._reconstituteAddress(reconstitutedAddresses[i][0]),
                reconstitutedAddresses[i][1]);
        }
    },

    /**
     * Test that L{Quotient.Compose.Controller.toggleMoreOptions} toggles the
     * visibility of the "more options" nodes
     */
    function test_toggleMoreOptions(self) {
        var controller = self.getController();
        var nodes = controller.nodesByAttribute("class", "more-options");
        self.failUnless(0 < nodes.length);

        for(var i = 0; i < nodes.length; i++) {
            self.assertEquals(nodes[i].style.display, "none");
        }
        controller.toggleMoreOptions();
        for(i = 0; i < nodes.length; i++) {
            self.assertEquals(nodes[i].style.display, "");
        }
    },

    /**
     * TestL{Quotient.Compose.Controller._toggleDisclosureLabels}
     */
    function test_toggleDisclosureLabels(self) {
        var controller = self.getController(),
            node = document.createElement("div"),
            l1 = document.createElement("div"),
            l2 = document.createElement("div");

        l1.className = "closed-label";
        l2.className = "open-label";

        l2.style.display = "none";
        node.appendChild(l1);
        node.appendChild(l2);

        controller._toggleDisclosureLabels(node);

        self.assertEquals(l1.style.display, "none");
        self.assertEquals(l2.style.display, "");

        controller._toggleDisclosureLabels(node);

        self.assertEquals(l1.style.display, "");
        self.assertEquals(l2.style.display, "none");
    });

/**
 * Tests for compose autocomplete
 */
Quotient.Test.ComposeAutoCompleteTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.ComposeAutoCompleteTestCase');
Quotient.Test.ComposeAutoCompleteTestCase.methods(
    /**
     * Make a L{Quotient.AutoComplete.Controller} with a
     * L{Quotient.Compose.EmailAddressAutoCompleteModel} and a
     * L{Quotient.Compose.EmailAddressAutoCompleteView}
     */
    function _setUp(self) {
        self.textbox = document.createElement("textarea");
        self.node.appendChild(self.textbox);
        self.completionsNode = document.createElement("div");
        self.node.appendChild(self.completionsNode);

        self.controller = Quotient.AutoComplete.Controller(
                            Quotient.Compose.EmailAddressAutoCompleteModel(
                                [['Larry', 'larry@host'],
                                 ['Larry Joey', 'larryjoey@host'],
                                 ['Xavier A.', 'other@host']]),
                            Quotient.Compose.EmailAddressAutoCompleteView(
                                self.textbox, self.completionsNode),
                            function(f, when) {
                                f();
                            });
    },

    /**
     * Send a fake keypress event for key C{keyCode} to C{node}
     *
     * @param node: node with C{onkeypress} handler
     * @type keyCode: C{Number}
     */
    function _fakeAKeypressEvent(self, node, keyCode) {
        node.onkeypress({keyCode: keyCode});
    },

    /**
     * Check that the DOM inside C{self.completionsNode} looks like the right
     * DOM for the list of completions C{completions}
     *
     * @type completions: C{Array} of C{String}
     */
    function _checkDOMCompletions(self, completions) {
        self.assertEquals(completions.length,
                          self.completionsNode.childNodes.length);

        for(var i = 0; i < completions.length; i++) {
            self.assertEquals(
                completions[i],
                self.completionsNode.childNodes[i].firstChild.nodeValue);
        }
    },

    /**
     * Test L{Quotient.Compose.EmailAddressAutoCompleteModel.isCompletion}
     */
    function test_isCompletion(self) {
        self._setUp();

        var model = self.controller.model,
            nameAddr = ['XXX Joe', 'xyz@host'];

        self.failUnless(model.isCompletion('jo', nameAddr));
        self.failUnless(model.isCompletion('xy', nameAddr));
        self.failUnless(model.isCompletion('xx', nameAddr));
    },

    /**
     * Negative tests for
     * L{Quotient.Compose.EmailAddressAutoCompleteModel.isCompletion}
     */
    function(self) {
        self._setUp();

        var model = self.controller.model,
            nameAddr = ['XXX Joe', 'xyz@host'];

        self.failIf(model.isCompletion('host', nameAddr));
        self.failIf(model.isCompletion(' ', nameAddr));
        self.failIf(model.isCompletion('', nameAddr));
    },

    /**
     * Test that a list of completions is visible when appropriate
     */
    function test_visibleCompletions(self) {
        self._setUp();

        self.controller.view.setValue('Larry');
        /* 0 is the keycode for all alphanumeric keypresses with onkeypress */
        self._fakeAKeypressEvent(self.textbox, 0);

        self.assertEquals(self.completionsNode.style.display, "");
        self._checkDOMCompletions(['"Larry" <larry@host>',
                                   '"Larry Joey" <larryjoey@host>']);
    },

    /**
     * Test that the completions node isn't visible when there are no
     * completions
     */
     function test_invisibleCompletions(self) {
        self._setUp();

        self.controller.view.setValue('Z');
        self._fakeAKeypressEvent(self.textbox, 0);

        self.assertEquals(self.completionsNode.style.display, "none");
        self._checkDOMCompletions([]);
    });



/**
 * Tests for roundtripping of recipient addresses
 */
Quotient.Test.ComposeToAddressTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.ComposeToAddressTestCase');
Quotient.Test.ComposeToAddressTestCase.methods(
    /**
     * Retrieve a compose widget from the server, add it as a child widget
     *
     * @param key: unique identifier for the test method
     * @param fromAddress: comma separated string of email addresses with
     * which to seed the ComposeFragment.
     */
    function setUp(self, key, fromAddress) {
        var result  = self.callRemote('getComposeWidget', key, fromAddress);
        result.addCallback(
            function(widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        result.addCallback(
            function(widget) {
                self.scrollingWidget = widget;
                self.node.appendChild(widget.node);
                return widget;
            });
        return result;
    },

    /**
     * Create a compose widget initialized with some from addresses, save a
     * draft, make sure that the server got the addresses which we specified
     */
    function test_roundtrip(self) {
        var addrs = ['foo@bar', 'bar@baz'];
        var result = self.setUp('roundtrip', addrs);
        result.addCallback(
            function(composer) {
                /* save a draft, but bypass all the dialog/looping stuff */
                composer.nodeByAttribute("name", "draft").checked = true;
                return composer.submit();
            });
        result.addCallback(
            function(result) {
                self.assertArraysEqual(result, addrs);
            });
        return result;
    });


Quotient.Test.MessageDetailTestHelper = Divmod.Class.subclass('Quotient.Test.MessageDetailTestHelper');
/**
 * A helper class which wraps a message detail and provides some utility
 * methods for checking various things about it
 */
Quotient.Test.MessageDetailTestHelper.methods(
    function __init__(self, widget) {
        self.widget = widget;
    },

    /**
     * Assert that the msg detail header fields that belong inside the "More
     * Detail" panel are visible or not
     *
     * @param failureFunction: function to call with a descriptive string if
     * we find something inconsistent
     * @type failureFunction: function
     *
     * @param visible: do we expect "More Detail" to be visible or not?
     * @type visible: boolean
     */
    function checkMoreDetailVisibility(self, failureFunction, visible) {
        var rows = self.widget.nodesByAttribute(
                    "class", "detailed-row");
        if(rows.length == 0) {
            failureFunction("expected at least one 'More Detail' row");
        }
        for(var i = 0; i < rows.length; i++) {
            if(visible != (rows[i].style.display != "none")) {
                failureFunction("one of the 'More Detail' rows has the wrong visibility");
            }
        }
    },

    /**
     * Collect the names/nodes of the headers being displayed by our
     * L{Quotient.Message.MessageDetail} widget, by looking at its DOM
     *
     * @return: mapping of header names to nodes
     * @type: C{Object}
     */
    function collectHeaders(self) {
        var hdrs = self.widget.firstNodeByAttribute("class", "msg-header-table"),
            fieldValues = {},
            cols, fieldName;

        function getElementsByTagNameShallow(parent, tagName) {
            var acc = [];
            for(var i = 0; i < parent.childNodes.length; i++) {
                if(parent.childNodes[i].tagName &&
                    parent.childNodes[i].tagName.toLowerCase() == tagName) {
                    acc.push(parent.childNodes[i]);
                }
            }
            return acc;
        }

        var rows = getElementsByTagNameShallow(hdrs, "tr");

        for(var i = 0; i < rows.length; i++) {
            cols = getElementsByTagNameShallow(rows[i], "td");
            if(cols.length < 2) {
                continue;
            }
            fieldName = cols[0].firstChild.nodeValue;
            fieldName = fieldName.toLowerCase().slice(0, -1);
            fieldValues[fieldName] = cols[1];
        }
        return fieldValues;
    },

    /**
     * Like L{collectHeaders}, but the values in the object returned are the
     * string values of each header, and headers without a simple string value
     * will not be included
     */
    function collectStringHeaders(self) {
        var headers = {}, _headers = self.collectHeaders();
        for(var k in _headers) {
            if(_headers[k].childNodes.length == 1
                && !_headers[k].firstChild.tagName) {
                headers[k] = _headers[k].firstChild.nodeValue;
            }
        }
        return headers;
    });


/**
 * Check that the message detail renders correctly
 */
Quotient.Test.MsgDetailTestCase = Nevow.Athena.Test.TestCase.subclass('Quotient.Test.MsgDetailTestCase');
Quotient.Test.MsgDetailTestCase.methods(
    function setUp(self) {
        var d = self.callRemote('setUp');
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.node.appendChild(widget.node);
                self.msgDetail = widget;
                self.testHelper = Quotient.Test.MessageDetailTestHelper(widget);
            });
        return d;
    },

    /**
     * Test that the headers in the DOM reflect the headers of the message
     * that is being rendered
     */
    function test_headers(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                var fieldvalues = self.testHelper.collectStringHeaders();

                var assertFieldsEqual = function(answers) {
                    for(var k in answers) {
                        self.assertEquals(fieldvalues[k], answers[k]);
                    }
                }

                assertFieldsEqual(
                    {from: '"Sender" <sender@host>',
                     to: "recipient@host",
                     subject: "the subject",
                     sent: "Wed, 31 Dec 1969 19:00:00 -0500",
                     received: "Wed, 31 Dec 1969 19:00:01 -0500"});
            });
        return result;
    },

    /**
     * Tests for the "More Detail" feature of
     * L{Quotient.Message.MessageDetail}
     */
    function test_moreDetail(self) {
        var result = self.setUp(),
            failureFunc = function(m) {
                self.fail(m);
            },
            checkAndToggle = function(value) {
                return function(ignored) {
                    self.testHelper.checkMoreDetailVisibility(
                        failureFunc, value);
                    var result = self.msgDetail.callRemote("getMoreDetailSetting");
                    result.addCallback(
                        function(setting) {
                            self.assertEquals(setting, value);
                            return self.msgDetail.toggleMoreDetail();
                        });
                    return result;
                }
            };

        result.addCallback(checkAndToggle(false));
        result.addCallback(checkAndToggle(true));
        result.addCallback(checkAndToggle(false));
        return result;
    });

Quotient.Test.MsgDetailAddPersonTestCase = Nevow.Athena.Test.TestCase.subclass(
                                                'Quotient.Test.MsgDetailAddPersonTestCase');

/**
 * Test case for the interaction between L{Quotient.Common.SenderPerson} and
 * L{Quotient.Message.MessageDetail}
 */
Quotient.Test.MsgDetailAddPersonTestCase.methods(
    function setUp(self, key) {
        var d = self.callRemote('setUp', key);
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.node.appendChild(widget.node);
                self.msgDetail = widget;
            });
        return d;
    },

    /**
     * Test showing Add Person dialog, and adding a person
     */
    function test_addPerson(self) {
        var result = self.setUp('addPerson');
        result.addCallback(
            function() {
                var sp = Nevow.Athena.Widget.get(
                            self.msgDetail.firstNodeByAttribute(
                                "athena:class",
                                "Quotient.Common.SenderPerson"));
                sp.showAddPerson();

                self.assertEquals(sp.dialog.node.style.display, "");
                self.assertEquals(sp.dialog.node.style.position, "absolute");

                var dialogLiveForm = Nevow.Athena.Widget.get(
                                        sp.dialog.node.getElementsByTagName(
                                            "form")[0]);

                return dialogLiveForm.submit().addCallback(
                    function() {
                        return self.callRemote("verifyPerson", "addPerson");
                    });
            });
        return result;
    });

Quotient.Test.MsgDetailInitArgsTestCase = Nevow.Athena.Test.TestCase.subclass(
                                                'Quotient.Test.MsgDetailInitArgsTestCase');
/**
 * Tests for the initArgs for L{Quotient.Message.MessageDetail}
 */
Quotient.Test.MsgDetailInitArgsTestCase.methods(
    function setUp(self) {
        var d = self.callRemote('setUp');
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.node.appendChild(widget.node);
                self.msgDetail = widget;
                self.testHelper = Quotient.Test.MessageDetailTestHelper(widget);
            });
        return d;
    },

    /**
     * Our python class returns True for the initial visibility of the "More
     * Detail" panel.  Make sure that this is reflected client-side
     */
    function test_moreDetailInitArg(self) {
        var result = self.setUp();
        result.addCallback(
            function(ignored) {
                self.testHelper.checkMoreDetailVisibility(
                    function(m) {
                        self.fail(m);
                    }, true);
            });
        return result;
    });

Quotient.Test.MsgDetailHeadersTestCase = Nevow.Athena.Test.TestCase.subclass(
                                            'Quotient.Test.MsgDetailHeadersTestCase');
/**
 * Tests for rendering of messages with various combinations of headers
 */
Quotient.Test.MsgDetailHeadersTestCase.methods(
    function setUp(self, headers) {
        var d = self.callRemote('setUp', headers);
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.node.appendChild(widget.node);
                self.msgDetail = widget;
                self.testHelper = Quotient.Test.MessageDetailTestHelper(widget);
            });
        return d;
    },

    /**
     * Test rendering of a message with a Resent-From header but no Resent-To
     */
    function test_resentFromNoResentTo(self) {
        var result = self.setUp({'Resent-From': 'user@host'});
        result.addCallback(
            function(ignored) {
                var headers = self.testHelper.collectStringHeaders();
                self.assertEquals(headers['resent from'], 'user@host');
                self.assertEquals(headers['resent to'], undefined);
            });
        return result;
    });

Quotient.Test.MsgDetailCCPeopleTestCase = Nevow.Athena.Test.TestCase.subclass(
                                            'Quotient.Test.MsgDetailCCPeopleTestCase');
/**
 * Tests for rendering a message with the CC header set and some people in the
 * store
 */
Quotient.Test.MsgDetailCCPeopleTestCase.methods(
    function setUp(self, peopleAddresses, headers) {
        var d = self.callRemote('setUp', peopleAddresses, headers);
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.node.appendChild(widget.node);
                self.msgDetail = widget;
                self.testHelper = Quotient.Test.MessageDetailTestHelper(widget);
            });
        return d;
    },

    /**
     * Test rendering a message with CC set but no people in the store
     *
     * There should be nodes for two L{Quotient.Common.SenderPerson} instances
     * inside the CC header node.
     */
    function test_noPeople(self) {
        var result = self.setUp([], {'cc': '1@host, 2@host'});
        result.addCallback(
            function(ignored) {
                var headers = self.testHelper.collectHeaders(),
                    cc = headers['cc'];

                self.assertEquals(cc.childNodes.length, 2);

                var spnodes = Nevow.Athena.NodesByAttribute(
                    cc, "athena:class", "Quotient.Common.SenderPerson");

                self.assertEquals(spnodes.length, 2);
            });
        return result;
    },

    /**
     * Test rendering a message where CC is set to an email address that
     * belongs to a person in the store
     *
     * The CC header node should contain the node for one person widget
     */
    function test_aPerson(self) {
        var result = self.setUp(['1@host'], {'cc': '1@host'});
        result.addCallback(
            function(ignored) {
                var headers = self.testHelper.collectHeaders(),
                    cc = headers['cc'];

                self.assertEquals(cc.childNodes.length, 1);
                self.assertEquals(
                    Nevow.Athena.NodesByAttribute(
                        cc, "class", "person-widget").length,
                    1);
            });
        return result;
    });


Quotient.Test.PostiniConfigurationTestCase = Nevow.Athena.Test.TestCase.subclass(
    'Quotient.Test.PostiniConfigurationTestCase');
/**
 * Tests for the Postini configuration form on the the Settings page.
 * See L{Quotient.Spam}.
 */
Quotient.Test.PostiniConfigurationTestCase.methods(
    function setUp(self) {
        var d = self.callRemote('setUp');
        d.addCallback(
            function (widgetInfo) {
                return self.addChildWidgetFromWidgetInfo(widgetInfo);
            });
        d.addCallback(
            function (widget) {
                self.postiniConfig = widget.childWidgets[0];
                self.usePostiniScore = self.postiniConfig.nodeByAttribute(
                    'name', 'usePostiniScore');
                self.postiniThreshhold = self.postiniConfig.nodeByAttribute(
                    'name', 'postiniThreshhold');
                self.node.appendChild(widget.node);
            });
        return d;
    },

    /**
     * Test that the postini configuration form is rendered with a checkbox
     * and a text field and that the checkbox defaults to unchecked and the
     * text field to "0.03".
     */
    function test_defaults(self) {
        var d = self.setUp();
        d.addCallback(
            function (ignored) {
                self.assertEquals(self.usePostiniScore.checked, false);
                self.assertEquals(self.postiniThreshhold.value, '0.03');
            });
        return d;
    },

    /**
     * Test that submitting the form with changed values changes the
     * configuration on the server
     */
    function test_submitChangesSettings(self) {
        var d = self.setUp();
        d.addCallback(
            function (ignored) {
                self.usePostiniScore.checked = true;
                self.postiniThreshhold.value = '5.0';
                return self.postiniConfig.submit();
            });
        d.addCallback(
            function() {
                return self.callRemote('checkConfiguration');
            });
        return d;
    },

    /**
     * Test that submitting the form preserves the new values on the form.
     */
    function test_submitPreservesFormValues(self) {
        var d = self.setUp();
        d.addCallback(
            function (ignored) {
                self.usePostiniScore.checked = true;
                self.postiniThreshhold.value = '5.0';
                return self.postiniConfig.submit();
            });
        d.addCallback(
            function() {
                self.assertEquals(self.usePostiniScore.checked, true);
                self.assertEquals(self.postiniThreshhold.value, '5.0');
            });
        return d;
    });


Quotient.Test.AddGrabberTestCase = Nevow.Athena.Test.TestCase.subclass(
                                        'Quotient.Test.AddGrabberTestCase');

Quotient.Test.AddGrabberTestCase.methods(
    function test_addGrabber(self) {
        var form = Nevow.Athena.Widget.get(
                        self.firstNodeByAttribute(
                            'athena:class',
                            'Quotient.Grabber.AddGrabberFormWidget'));
        var inputs = form.gatherInputs();

        inputs['domain'].value = 'foo.bar';
        inputs['username'].value = 'foo';
        inputs['password1'].value = 'foo';
        inputs['password2'].value = 'zoo';

        return form.submit().addErrback(
            function() {
                self.fail('AddGrabberFormWidget did not catch the submit error');
            });
    });

Quotient.Test.GrabberListTestCase = Nevow.Athena.Test.TestCase.subclass(
                                        'Quotient.Test.GrabberListTestCase');

Quotient.Test.GrabberListTestCase.methods(
    /**
     * Test that the grabber list is initially visible when
     * we have one grabber, and that it becomes invisible when
     * we delete the grabber
     */
    function test_visibility(self) {
        var scrollerNode = self.firstNodeByAttribute(
            "class", "scrolltable-widget-node");

        var scrollWidget = Nevow.Athena.Widget.get(scrollerNode)
        scrollWidget.initializationDeferred.addCallback(
            function(ignored) {
                /* there is one grabber.  make sure the table is visible */
                self.assertEquals(scrollerNode.style.display, "");

                var D = self.callRemote("deleteGrabber");
                D.addCallback(
                    function() {
                        /* grabber has been deleted.  reload scrolltable */
                        D = scrollWidget.emptyAndRefill();
                        D.addCallback(
                            function() {
                                /* make sure it isn't visible */
                                self.assertEquals(scrollerNode.style.display, "none");
                            });
                        return D;
                    });
                return D;
            });
        return scrollWidget.initializationDeferred;
    });

Quotient.Test.ButtonTogglerTestCase = Nevow.Athena.Test.TestCase.subclass(
    'Quotient.Test.ButtonTogglerTestCase');
/**
 * Tests for L{Quotient.Common.ButtonToggler}
 */
Quotient.Test.ButtonTogglerTestCase.methods(
    /**
     * Make an element which is structured like a Quotient UI button, and
     * return it
     *
     * @return: object with "button" and "link" members, where "button" is the
     * button node, and "link" is child <a> node
     * @rtype: C{Object}
     */
    function _makeButton(self) {
        var button = self.nodeByAttribute("class", "button"),
            button = button.cloneNode(true),
            link = button.getElementsByTagName("a")[0];

        button.style.opacity = 1;
        return {button: button, link: link};
    },

    /**
     * Return an object with "toggler", "disabledTest" and "enabledTest"
     * members, where "toggler" is a L{Quotient.Common.ButtonToggler} and the
     * other two members are thunks which verify that the current state of the
     * button is consistent with what we expect for the disabled and enabled
     * states, respectively
     *
     * @rtype: C{Object}
     */
    function _makeTogglerTester(self) {
        var button = self._makeButton(),
            onclick = button.link.onclick = function() {
                return true;
            },
            OPACITY = 0.32,
            toggler = Quotient.Common.ButtonToggler(button.button, OPACITY);

        return {toggler: toggler,
                disabledTest: function() {
                    self.assertEquals(
                        button.button.style.opacity, OPACITY.toString());
                    /* our onclick returns true, and we want to make sure that
                     * the handler in place returns false, so that clicks do
                     * nothing */
                    self.assertEquals(button.link.onclick(), false);
                },
                enabledTest: function() {
                   self.assertEquals(button.button.style.opacity, '1');
                   self.assertEquals(button.link.onclick, onclick);
                }};
    },

    /**
     * Test the C{enable}/C{disable} methods of
     * L{Quotient.Common.ButtonToggler}
     */
    function test_enableDisable(self) {
        var tester = self._makeTogglerTester();

        tester.enabledTest();
        tester.toggler.disable();
        tester.disabledTest();
        tester.toggler.enable();
        tester.enabledTest();
    },

    /**
     * Test L{Quotient.Common.ButtonToggler.disableUntilFires}
     */
    function test_disableUntilFires(self) {
        var tester = self._makeTogglerTester(),
            D = Divmod.Defer.Deferred(),
            DEFERRED_RESULT = 'hi';

        tester.enabledTest();
        tester.toggler.disableUntilFires(D);
        tester.disabledTest();
        D.addCallback(
            function(result) {
                self.assertEquals(result, DEFERRED_RESULT);
                tester.enabledTest();
            });
        D.callback(DEFERRED_RESULT);
        return D;
    },

    /**
     * Test opacity defaulting
     */
    function test_opacityDefaulting(self) {
        var button = self._makeButton(),
            toggler = Quotient.Common.ButtonToggler(button.button);

        button.link.onclick = function() {
            /* just set it to something so the toggler doesn't complain */
        }
        self.assertEquals(button.button.style.opacity, '1');
        toggler.disable();
        self.assertEquals(button.button.style.opacity, '0.4');
    });

Quotient.Test.ShowNodeAsDialogTestCase = Nevow.Athena.Test.TestCase.subclass(
                                            'Quotient.Test.ShowNodeAsDialogTestCase');

Quotient.Test.ShowNodeAsDialogTestCase.methods(
    function test_showNodeAsDialog(self) {
        /* get the original node */
        var node = self.firstNodeByAttribute(
                        "class",
                        "ShowNodeAsDialogTestCase-dialog");
        /* show it as a dialog */
        var dialog = Quotient.Common.Util.showNodeAsDialog(node);

        var getElements = function() {
            return Nevow.Athena.NodesByAttribute(
                    document.body,
                    "class",
                    "ShowNodeAsDialogTestCase-dialog");
        }

        /* get all elements with the same class name as our node */
        var nodes = getElements();

        /* should be two - the original and the cloned dialog */
        self.assertEquals(nodes.length, 2);
        var orignode = nodes[0], dlgnode = nodes[1];
        self.assertEquals(dlgnode, dialog.node);

        self.assertEquals(orignode.style.display, "none");
        self.assertEquals(dlgnode.style.display, "");
        self.assertEquals(dlgnode.style.position, "absolute");

        dialog.hide();

        nodes = getElements();

        /* should be one, now that the dialog has been hidden */
        self.assertEquals(nodes.length, 1);
        self.assertEquals(nodes[0], orignode);
    });

Quotient.Test.DraftsTestCase = Nevow.Athena.Test.TestCase.subclass(
                                    'Quotient.Test.DraftsTestCase');

/**
 * Tests for xquotient.compose.DraftsScreen
 */
Quotient.Test.DraftsTestCase.methods(
    /**
     * Get a handle on the drafts scrolltable, and return
     * a deferred that'll fire when it's done initializing
     */
    function setUp(self) {
        if(!self.scroller) {
            self.scroller = Nevow.Athena.Widget.get(
                                self.firstNodeByAttribute(
                                    "athena:class",
                                    "Quotient.Compose.DraftListScrollingWidget"));
        }
        return self.scroller.initializationDeferred;
    },

    /**
     * Basic test, just make sure the scrolltable can initialize
     */
    function test_initialization(self) {
        return self.setUp();
    },

    /**
     * Assert that the rows in the drafts scrolltable have subjects
     * that match those of the items created by our python counterpart
     */
    function test_rows(self) {
        return self.setUp().addCallback(
            function() {
                for(var i = 4; i <= 0; i--) {
                    self.assertEquals(
                        parseInt(self.scroller.model.getRowData(i).subject), i);
                }
            });
    });

from twisted.trial import unittest

from email import Parser

from axiom import store
from axiom import scheduler
from axiom import item
from axiom import attributes

from xmantissa import webapp

from xquotient import compose, mail



class SmarthostCompositionTestMixin(object):
    """
    A mixin for setting up an appropriately-factored composition
    environment.

    * Set up a L{store.Store}, optionally on-disk with the 'dbdir'
      argument to setUp.
    * Sets up a C{reactor} attribute on your test case to a
      L{Reactor} that will collect data about connectTCP calls (made
      by the ESMTP-sending code in compose.py; FIXME: make it work
      for the non-smarthost case too.
    * Set up a composer object
    * Set up preferences for that composer
    """

    def setUp(self, dbdir=None):
        self.reactor = Reactor()
        self._originalSendmail = compose._esmtpSendmail
        compose._esmtpSendmail = self._esmtpSendmail

        self.store = store.Store(dbdir=dbdir)
        scheduler.Scheduler(store=self.store).installOn(self.store)
        self.prefs = compose.ComposePreferenceCollection(
            store=self.store,
            preferredSmarthost=u'example.org',
            smarthostUsername=u'radix',
            smarthostPassword=u'secret',
            )
        self.prefs.installOn(self.store)

        self.composer = compose.Composer(store=self.store, 
                                         fromAddress=u'radix@example.com')
        self.composer.installOn(self.store)


    def _esmtpSendmail(self, *args, **kwargs):
        kwargs['reactor'] = self.reactor
        return self._originalSendmail(*args, **kwargs)
        

    def tearDown(self):
        compose._esmtpSendmail = self._originalSendmail



class StubStoredMessageAndImplAndSource(item.Item):
    """
    Mock several objects at once:

    1. An L{exmess.Message}

    2. The 'impl' attribute of that message, typically a L{mimestore.Part}

    3. The message file returned from the C{open} method of C{impl}. 
       XXX: This returns something that doesn't conform to the file protocol,
       but the code that triggers the usage of that protocol isn't triggered
       by the following tests.
    """
    outgoing = attributes.boolean()
    impl = property(lambda s: s)
    source = property(lambda s: s)

    def open(self):
        return "HI DUDE"



class Reactor(object):
    """
    Act as a reactor that collects connectTCP call data.
    """
    def connectTCP(self, host, port, factory):
        self.host = host
        self.port = port
        self.factory = factory



class ComposeFromTest(SmarthostCompositionTestMixin, unittest.TestCase):

    def test_sendmailSendsToAppropriatePort(self):
        """
        Sending a message should deliver to the smarthost on the
        configured port.
        """
        self.prefs.smarthostPort = 26
        message = StubStoredMessageAndImplAndSource(store=self.store)
        self.composer.sendMessage([u'testuser@example.com'], message)
        self.assertEquals(self.reactor.port, 26)


    def test_sendmailSendsFromAppropriateAddress(self):
        """
        If there are smarthost preferences, the from address that they
        specify should be used.
        """
        self.prefs.smarthostAddress = u'testuser2@example.com'
        message = StubStoredMessageAndImplAndSource(store=self.store)
        self.composer.sendMessage([u'targetuser@example.com'], message)
        self.assertEquals(str(self.reactor.factory.fromEmail),
                          u'testuser2@example.com')



class ComposeFragmentTest(SmarthostCompositionTestMixin, unittest.TestCase):
    """
    Test the L{ComposeFragment}.
    """

    def setUp(self):
        """
        Create an *on-disk* store (XXX This is hella slow) and set up
        some dependencies that ComposeFragment needs.
        """
        SmarthostCompositionTestMixin.setUp(self, dbdir=self.mktemp())

        webapp.PrivateApplication(store=self.store).installOn(self.store)
        da = mail.DeliveryAgent(store=self.store)
        da.installOn(self.store)


    def test_createMessageHonorsSmarthostFromAddress(self):
        """
        Sending a message through the Compose UI should honor the from
        address setting in the smarthost.
        """
        self.prefs.smarthostAddress = u'from@example.com'
        cf = compose.ComposeFragment(self.composer)
        msg = cf.createMessage(u'testuser@example.com',
                               u'Sup dood', u'A body', u'', u'', u'')
        file = msg.impl.source.open()
        msg = Parser.Parser().parse(file)
        self.assertEquals(msg["from"], 'from@example.com')

    def test_onlyHonorFromAddressIfSmarthostSet(self):
        """
        Don't allow people to forge their from headers in mail that
        doesn't go through a smarthost.
        """
        self.prefs.preferredSmarthost = None
        self.prefs.smarthostAddress = u'from@example.com'
        cf = compose.ComposeFragment(self.composer)
        msg = cf.createMessage(u'testuser@example.com',
                               u'Sup dood', u'A body', u'', u'', u'')
        file = msg.impl.source.open()
        msg = Parser.Parser().parse(file)
        self.assertEquals(msg["from"], 'radix@example.com')
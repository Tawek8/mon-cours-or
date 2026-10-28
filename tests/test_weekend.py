import unittest
from datetime import datetime
from unittest.mock import patch
import kitco
from market import validate_quote

class WeekendTests(unittest.TestCase):
    def test_closing_quote(self):
        for now in ['2026-10-24T12:00:00+00:00', '2026-10-25T12:00:00+00:00']:
            quote = kitco.parse({'PreciousMetals': {'PM': dict(Symbol='AU', Currency='EUR', Unit='KILO', Bid=120000, Timestamp='Oct 23, 2026 16:00')}}, now)
            self.assertTrue(quote['marketClosed'])
            self.assertEqual(quote['price'], 120000)

    def test_reject_previous_session_and_future(self):
        now = datetime.fromisoformat('2026-10-25T12:00:00+00:00')
        for at in ['2026-10-22T20:00:00+00:00', '2026-10-25T13:00:00+00:00']:
            with self.assertRaises(ValueError):
                validate_quote(datetime.fromisoformat(at), now, 120)

    def test_reopening(self):
        at = datetime.fromisoformat('2026-10-23T20:00:00+00:00')
        with self.assertRaises(ValueError):
            validate_quote(at, datetime.fromisoformat('2026-10-25T22:00:00+00:00'), 180)

    def test_dst_and_daily_break(self):
        for now, at in [('2026-11-01T22:30:00+00:00','2026-10-30T20:00:00+00:00'), ('2026-10-26T21:30:00+00:00','2026-10-26T20:59:00+00:00')]:
            self.assertIsNotNone(validate_quote(datetime.fromisoformat(at), datetime.fromisoformat(now), 120))

    def test_bullionvault_fallback(self):
        import server
        server._cache.clear()
        quote = dict(price=120000, quotedAt='2026-10-23T20:00:00+00:00', retrievedAt='2026-10-25T12:00:00+00:00', marketClosed=True)
        with patch('kitco.fetch_quote', side_effect=ValueError('indisponible')), patch('bullionvault.fetch_quote', return_value=quote):
            result = server.spot_live()
        self.assertTrue(result['marketClosed'])
        self.assertEqual(result['source'], 'BullionVault')

if __name__ == '__main__':
    unittest.main()

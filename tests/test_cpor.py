import unittest
from pathlib import Path
from unittest.mock import patch
import cpor

TABLE = Path(__file__).with_name('loomis-table.txt').read_text(encoding='utf-8')

class CporTests(unittest.TestCase):
    def test_official_table_without_product_page(self):
        quote = cpor.parse(TABLE)
        self.assertEqual(quote['prices']['cpor'], 115650)
        self.assertEqual(quote['prices']['coq'], 700)
        self.assertEqual(quote['sourceDate'], '2026-10-23')
        self.assertEqual(len(quote['products']), 24)
        self.assertNotIn('us10', quote['prices'])
        self.assertNotIn('tunisie', quote['prices'])

    def test_live_needs_only_table(self):
        with patch.object(cpor, '_cache', None), patch.object(cpor, 'fetch', return_value=TABLE) as fetch:
            self.assertEqual(cpor.live()['prices']['cpor'], 115650)
            fetch.assert_called_once_with(cpor.TABLE)

    def test_inconsistent_dates_rejected(self):
        with self.assertRaises(ValueError):
            cpor.parse(TABLE.replace('23/10/2026', '22/10/2026', 1))

    def test_incomplete_table_rejected(self):
        with self.assertRaises(ValueError):
            cpor.parse(TABLE.replace('<strong>Lingot</strong>', '<strong>Inconnu</strong>'))

    def test_optional_crosscheck_still_rejects_mismatch(self):
        with self.assertRaises(ValueError):
            cpor.parse(TABLE, '<div class="value">1,00 €</div>')

if __name__ == '__main__':
    unittest.main()

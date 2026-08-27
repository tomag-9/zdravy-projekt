"""`gramage_table_html._row` prekladá spec do značiek — testy zamykajú, že farba
textu a podfarbenie diétneho riadku (#536) obe skončia v jednom `style` atribúte,
nie že sa navzájom prepíšu."""

from api.exporters.gramage_table_html import _row


def test_row_renders_both_colour_and_background():
    html = _row(
        {
            "kind": "sub-row",
            "css": "sub-row diet",
            "color": "#966107",
            "background": "#FDF0D9",
            "cells": [{"text": "No Milk"}],
        }
    )
    assert 'style="color: #966107; background-color: #FDF0D9"' in html


def test_row_without_background_only_sets_colour():
    html = _row(
        {
            "kind": "sub-row",
            "css": "sub-row",
            "color": "#425422",
            "cells": [{"text": "Menu A"}],
        }
    )
    assert 'style="color: #425422"' in html
    assert "background-color" not in html


def test_row_without_colour_or_background_has_no_style_attribute():
    html = _row({"kind": "sub-row", "css": "sub-row", "cells": [{"text": "Menu A"}]})
    assert " style=" not in html

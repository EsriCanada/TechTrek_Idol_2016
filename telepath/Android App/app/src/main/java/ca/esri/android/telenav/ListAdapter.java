package ca.esri.android.telenav;

import android.content.Context;
import android.util.Log;
import android.widget.ArrayAdapter;
import android.widget.SectionIndexer;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class ListAdapter extends ArrayAdapter<String> implements SectionIndexer {

    HashMap<String, Integer> mapIndex;
    String[] sections;
    List<String> entries;

    public ListAdapter(Context context, List<String> myList) {
        super(context, android.R.layout.simple_list_item_1, myList);

        this.entries = myList;
        mapIndex = new LinkedHashMap<String, Integer>();

        for (int x = 0; x < entries.size(); x++) {
            String entry = entries.get(x);
            String ch = entry.substring(0, 1);
            ch = ch.toUpperCase(Locale.US);
            mapIndex.put(ch, x);
            /*
            while(mapIndex.containsKey(ch)){
                ch = ch + "..";
            }
            */

            // HashMap will prevent duplicates
        }

        Set<String> sectionLetters = mapIndex.keySet();

        // create a list from the set to sort
        ArrayList<String> sectionList = new ArrayList<>(sectionLetters);

        Log.d("sectionList", sectionList.toString());
        Collections.sort(sectionList);

        sections = new String[sectionList.size()];

        sectionList.toArray(sections);
    }

    public int getPositionForSection(int section) {
        Log.d("section", "" + section);
        return mapIndex.get(sections[section]);
    }

    public int getSectionForPosition(int position) {
        Log.d("position", "" + position);
        return 0;
    }

    public Object[] getSections() {
        return sections;
    }
}
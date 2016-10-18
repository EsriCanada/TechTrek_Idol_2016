package ca.esri.android.telenav;

import android.util.Log;

import com.google.android.gms.drive.DriveId;
import com.google.android.gms.drive.events.CompletionEvent;
import com.google.android.gms.drive.events.DriveEventService;

/**
 * Created by Michael on 5/27/2016.
 */
public class DriveService extends DriveEventService {
    private static final String TAG = "_X_";

    @Override
    public void onCompletion(CompletionEvent event) {
        super.onCompletion(event);
        DriveId driveId = event.getDriveId();
        String t = event.getDriveId().getResourceId();
        Log.d(TAG, "onComplete: " + driveId.getResourceId());
        switch (event.getStatus()) {
            case CompletionEvent.STATUS_CONFLICT:  Log.d(TAG, "STATUS_CONFLICT"); event.dismiss(); break;
            case CompletionEvent.STATUS_FAILURE:   Log.d(TAG, "STATUS_FAILURE");  event.dismiss(); break;
            case CompletionEvent.STATUS_SUCCESS:   Log.d(TAG, "STATUS_SUCCESS "); event.dismiss(); break;
        }
    }
}
